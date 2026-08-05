-- ============================================================================
-- URBarber - Supabase Storage Buckets & RLS Security Policies
-- ============================================================================
-- Purpose:
--   1. Alter storage.objects.owner and owner_id columns to TEXT (Firebase 28-char text UID compatibility).
--   2. Create safe auth helper functions for Firebase Auth text UIDs (non-UUID).
--   3. Create public (public-media) and private (private-documents) storage buckets.
--   4. Configure Row Level Security (RLS) on storage.objects for Firebase Auth JWTs.
--   5. Restrict file writes strictly to the user's own Firebase UID folder.
--   6. Allow platform administrators (app_role = 'admin') to read private verification documents.
--
-- How to apply:
--   Run this file in the Supabase Dashboard -> SQL Editor (or local Supabase).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ALTER STORAGE.OBJECTS OWNER & OWNER_ID COLUMNS TO TEXT (FIREBASE TEXT UID SUPPORT)
-- ----------------------------------------------------------------------------

-- Remove default constraints calling auth.uid()::uuid and alter owner/owner_id columns to text
ALTER TABLE storage.objects ALTER COLUMN owner DROP DEFAULT;
ALTER TABLE storage.objects ALTER COLUMN owner DROP NOT NULL;
ALTER TABLE storage.objects ALTER COLUMN owner TYPE text USING owner::text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'storage' AND table_name = 'objects' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE storage.objects ALTER COLUMN owner_id DROP DEFAULT;
    ALTER TABLE storage.objects ALTER COLUMN owner_id DROP NOT NULL;
    ALTER TABLE storage.objects ALTER COLUMN owner_id TYPE text USING owner_id::text;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. SAFE AUTH HELPERS FOR FIREBASE UIDs
-- ----------------------------------------------------------------------------

-- Override auth.uid() to safely return NULL when JWT 'sub' is a 28-char Firebase text UID
-- instead of crashing with "invalid input syntax for type uuid"
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN (COALESCE(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), ''),
      nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')
    )) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (COALESCE(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), ''),
      nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')
    ))::uuid
    ELSE NULL
  END
$$;

-- Helper function returning raw Firebase text UID
CREATE OR REPLACE FUNCTION auth.firebase_uid()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), ''),
    nullif((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')
  )
$$;

-- ----------------------------------------------------------------------------
-- 3. BUCKET INITIALIZATION
-- ----------------------------------------------------------------------------

-- Insert or update public-media bucket (Public access for avatars, barbers, services)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-media',
  'public-media',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Insert or update private-documents bucket (Private access for verification documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'private-documents',
  'private-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'application/pdf'];

-- ----------------------------------------------------------------------------
-- 4. ENABLE ROW LEVEL SECURITY & CLEAN OLD POLICIES
-- ----------------------------------------------------------------------------

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on storage.objects to remove old default policies using auth.uid()::uuid
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. RLS POLICIES FOR PUBLIC-MEDIA BUCKET
-- ----------------------------------------------------------------------------

-- Policy 1: Anyone (public or authenticated) can view/download public media
CREATE POLICY "Public Read Access for public-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

-- Policy 2: Authenticated users can upload to public-media ONLY inside their own Firebase UID folder
-- e.g. path: public-media/{user_uid}/avatars/avatar.jpg
CREATE POLICY "Authenticated Upload to public-media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-media'
  AND split_part(name, '/', 1) = auth.firebase_uid()
);

-- Policy 3: Authenticated users can update files ONLY inside their own Firebase UID folder
CREATE POLICY "Authenticated Update in public-media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-media'
  AND split_part(name, '/', 1) = auth.firebase_uid()
);

-- Policy 4: Authenticated users can delete files ONLY inside their own Firebase UID folder
CREATE POLICY "Authenticated Delete in public-media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-media'
  AND split_part(name, '/', 1) = auth.firebase_uid()
);

-- ----------------------------------------------------------------------------
-- 6. RLS POLICIES FOR PRIVATE-DOCUMENTS BUCKET
-- ----------------------------------------------------------------------------

-- Policy 5: File owner (matching UID folder) OR Admin (app_role = 'admin') can read private documents
CREATE POLICY "Owner or Admin Read Access for private-documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'private-documents'
  AND (
    split_part(name, '/', 1) = auth.firebase_uid()
    OR (auth.jwt() ->> 'app_role' = 'admin')
  )
);

-- Policy 6: Only the file owner can upload files to private-documents inside their own Firebase UID folder
CREATE POLICY "Owner Upload to private-documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'private-documents'
  AND split_part(name, '/', 1) = auth.firebase_uid()
);

-- Policy 7: Only the file owner can update files in private-documents inside their own Firebase UID folder
CREATE POLICY "Owner Update in private-documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'private-documents'
  AND split_part(name, '/', 1) = auth.firebase_uid()
);

-- Policy 8: Only the file owner can delete files in private-documents inside their own Firebase UID folder
CREATE POLICY "Owner Delete in private-documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'private-documents'
  AND split_part(name, '/', 1) = auth.firebase_uid()
);
