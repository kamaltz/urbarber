-- ============================================================================
-- URBarber - Supabase Storage Buckets & RLS Security Policies
-- ============================================================================
-- Purpose:
--   1. Create public (public-media) and private (private-documents) storage buckets.
--   2. Configure Row Level Security (RLS) on storage.objects for Firebase Auth JWTs.
--   3. Restrict file writes strictly to the user's own Firebase UID folder ({firebaseUid}/...).
--   4. Allow platform administrators (app_role = 'admin') to read private verification documents.
--
-- How to apply:
--   Run this file in the Supabase Dashboard -> SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BUCKET INITIALIZATION
-- ----------------------------------------------------------------------------

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
-- 2. DROP LEGACY POLICIES BY EXPLICIT POLICY NAME
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public Read Access for public-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload to public-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update in public-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete in public-media" ON storage.objects;
DROP POLICY IF EXISTS "Owner or Admin Read Access for private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Upload to private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update in private-documents" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete in private-documents" ON storage.objects;
DROP POLICY IF EXISTS "URBarber public media select" ON storage.objects;
DROP POLICY IF EXISTS "URBarber public media insert own" ON storage.objects;
DROP POLICY IF EXISTS "URBarber public media update own" ON storage.objects;
DROP POLICY IF EXISTS "URBarber public media delete own" ON storage.objects;
DROP POLICY IF EXISTS "URBarber private documents read owner admin" ON storage.objects;
DROP POLICY IF EXISTS "URBarber private documents insert own" ON storage.objects;
DROP POLICY IF EXISTS "URBarber private documents update own" ON storage.objects;
DROP POLICY IF EXISTS "URBarber private documents delete own" ON storage.objects;

-- ----------------------------------------------------------------------------
-- 3. CANONICAL RLS POLICIES FOR PUBLIC-MEDIA BUCKET
-- ----------------------------------------------------------------------------

CREATE POLICY "Public Read Access for public-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

CREATE POLICY "URBarber public media insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

CREATE POLICY "URBarber public media update own"
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

CREATE POLICY "URBarber public media delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'public-media'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

-- ----------------------------------------------------------------------------
-- 4. CANONICAL RLS POLICIES FOR PRIVATE-DOCUMENTS BUCKET
-- ----------------------------------------------------------------------------

CREATE POLICY "URBarber private documents read owner admin"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'private-documents'
  AND (
    (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
    OR (auth.jwt() ->> 'app_role' = 'admin')
  )
);

CREATE POLICY "URBarber private documents insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);

CREATE POLICY "URBarber private documents update own"
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

CREATE POLICY "URBarber private documents delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
);
