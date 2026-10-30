-- ============================================================================
-- MIGRATION 0004: PRIVATE STORAGE BUCKET & SUBMISSION ASSETS RLS POLICIES
-- Project: DesignGrade AI (Phase 3)
-- ============================================================================

-- 1. Buat Private Bucket 'submission-assets' (Maks 10MB, Hanya PNG/JPG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-assets',
  'submission-assets',
  FALSE,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- 2. Kebijakan RLS untuk Tabel public.submission_assets
DROP POLICY IF EXISTS "View submission assets for own submissions or managed classes" ON public.submission_assets;
CREATE POLICY "View submission assets for own submissions or managed classes"
ON public.submission_assets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.id = submission_assets.submission_id
      AND (
        s.student_id = auth.uid()
        OR a.teacher_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
      )
  )
);

DROP POLICY IF EXISTS "Students insert assets for own submissions" ON public.submission_assets;
CREATE POLICY "Students insert assets for own submissions"
ON public.submission_assets FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = submission_assets.submission_id
      AND s.student_id = auth.uid()
      AND s.status IN ('draft', 'submitted', 'revision_requested')
  )
);

DROP POLICY IF EXISTS "Students delete assets on own draft submissions" ON public.submission_assets;
CREATE POLICY "Students delete assets on own draft submissions"
ON public.submission_assets FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    WHERE s.id = submission_assets.submission_id
      AND s.student_id = auth.uid()
      AND s.status IN ('draft', 'revision_requested')
  )
);

-- 3. Kebijakan RLS untuk storage.objects pada bucket 'submission-assets'
-- Struktur Path: {class_id}/{assignment_id}/{student_id}/v{version}/{uuid}.{ext}
-- Segmen ke-3 ((storage.foldername(name))[3]) wajib sama dengan auth.uid()
DROP POLICY IF EXISTS "Students upload to own isolated folder" ON storage.objects;
CREATE POLICY "Students upload to own isolated folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'submission-assets'
  AND (storage.foldername(name))[3] = auth.uid()::text
);

DROP POLICY IF EXISTS "Students and teachers read authorized submission files" ON storage.objects;
CREATE POLICY "Students and teachers read authorized submission files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'submission-assets'
  AND (
    (storage.foldername(name))[3] = auth.uid()::text
    OR public.is_teacher_of_class(((storage.foldername(name))[1])::uuid)
    OR public.get_current_user_role() = 'admin'
  )
);

DROP POLICY IF EXISTS "Students delete own draft storage objects" ON storage.objects;
CREATE POLICY "Students delete own draft storage objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'submission-assets'
  AND (storage.foldername(name))[3] = auth.uid()::text
);