-- ============================================================================
-- URBarber - Supabase Storage Buckets & RLS Security Policies
-- ============================================================================
-- Purpose:
--   1. Create public (public-media) and private (private-documents) storage buckets.
--   2. Configure Row Level Security (RLS) on storage.objects for Firebase Auth JWTs.
--   3. Restrict file writes strictly to the user's own Firebase UID folder ({firebaseUid}/...).
--   4. Private verification documents are readable ONLY by their owner via the client SDK.
--      Admin access goes exclusively through the trusted Vercel backend's server client
--      (SUPABASE_SECRET_KEY), which issues short-lived signed URLs -- see Policy 5 below.
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
DROP POLICY IF EXISTS "Owner Read Access for private-documents" ON storage.objects;
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
-- 3. RLS POLICIES FOR PUBLIC-MEDIA BUCKET
-- ----------------------------------------------------------------------------

-- Policy 1: Anyone (public or authenticated) can view/download public media
CREATE POLICY "Public Read Access for public-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-media');

-- Policy 2: Authenticated users can upload to public-media ONLY inside their own Firebase UID folder
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

-- Policy 5: ONLY the file owner (matching UID folder) can read private documents
-- directly via the client SDK. Batch 09D-2A: removed the "OR app_role = 'admin'"
-- clause -- Admin document access now goes exclusively through the trusted Vercel
-- backend (service-role client, see backend/vercel/src/lib/supabase-admin.ts),
-- which generates short-lived signed URLs after validating the request server-side.
-- The service-role key used by that backend bypasses RLS entirely by design, so it
-- does not need (and must not rely on) a client-facing admin-read policy.
CREATE POLICY "Owner Read Access for private-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'private-documents'
  AND (storage.foldername(name))[1] = (auth.jwt() ->> 'sub')
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
