-- ============================================================================
-- URBarber - Supabase Storage Buckets & RLS Security Policies
-- ============================================================================
-- Purpose:
--   1. Initialize public-media and private-documents buckets idempotently.
--   2. Configure Row Level Security (RLS) on storage.objects for Firebase Auth JWTs.
--   3. Restrict file operations strictly to the user's own Firebase UID folder using (storage.foldername(name))[1] = (auth.jwt() ->> 'sub').
--   4. Allow platform administrators (app_role = 'admin') to read private verification documents.
--
-- Note:
--   - Does NOT alter storage.objects.owner or owner_id columns.
--   - Does NOT replace or override auth.uid().
--   - Does NOT drop all policies on storage.objects dynamically.
--   - Uses (auth.jwt() ->> 'sub') text matching without ::uuid casting.
--
-- How to apply:
--   Run this file in the Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BUCKET INITIALIZATION (Idempotent)
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
-- 2. ENABLE ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- Explicitly drop only known URBarber legacy policies for idempotent re-execution
DROP POLICY IF EXISTS "Public Read Access for public-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to public-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update in public-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete in public-media" ON storage.objects;

DROP POLICY IF EXISTS "Owner or Admin Read Access for private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Read Access for private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Upload to private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update in private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete in private-documents" ON storage.objects;

-- ----------------------------------------------------------------------------
-- 3. RLS POLICIES FOR PUBLIC-MEDIA BUCKET
-- ----------------------------------------------------------------------------

-- Policy 1: Anyone (public or authenticated) can view/download public media
CREATE POLICY "Public Read Access for public-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

-- Policy 2: Authenticated users can upload to public-media ONLY inside their own Firebase UID folder
-- e.g. path: public-media/{user_uid}/avatars/avatar.jpg
CREATE POLICY "Authenticated Upload to public-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- Policy 3: Authenticated users can update files ONLY inside their own Firebase UID folder
CREATE POLICY "Authenticated Update in public-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
)
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- Policy 4: Authenticated users can delete files ONLY inside their own Firebase UID folder
CREATE POLICY "Authenticated Delete in public-media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- ----------------------------------------------------------------------------
-- 4. RLS POLICIES FOR PRIVATE-DOCUMENTS BUCKET
-- ----------------------------------------------------------------------------

-- Policy 5: File owner (matching UID folder) OR Admin (app_role = 'admin') can read private documents
CREATE POLICY "Owner or Admin Read Access for private-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'private-documents'
  AND (
    (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    OR (auth.jwt() ->> 'app_role' = 'admin')
  )
);

-- Policy 6: Only the file owner can upload files to private-documents inside their own Firebase UID folder
CREATE POLICY "Owner Upload to private-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- Policy 7: Only the file owner can update files in private-documents inside their own Firebase UID folder
CREATE POLICY "Owner Update in private-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
)
WITH CHECK (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- Policy 8: Only the file owner can delete files in private-documents inside their own Firebase UID folder
CREATE POLICY "Owner Delete in private-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);
