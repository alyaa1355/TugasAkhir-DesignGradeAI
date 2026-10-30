-- ============================================================================
-- MIGRATION 0006: RLS POLICIES FOR AI ASSESSMENTS & SUBMISSION STATUS UPDATES
-- Project: DesignGrade AI (Phase 4)
-- ============================================================================

-- 1. Kebijakan RLS untuk tabel public.ai_assessments
DROP POLICY IF EXISTS "View AI assessments for own submissions or managed classes" ON public.ai_assessments;
CREATE POLICY "View AI assessments for own submissions or managed classes"
ON public.ai_assessments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.id = ai_assessments.submission_id
      AND (
        s.student_id = auth.uid()
        OR a.teacher_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
      )
  )
);

DROP POLICY IF EXISTS "Insert AI assessments for authorized submissions" ON public.ai_assessments;
CREATE POLICY "Insert AI assessments for authorized submissions"
ON public.ai_assessments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.id = ai_assessments.submission_id
      AND (
        s.student_id = auth.uid()
        OR a.teacher_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
      )
  )
);

DROP POLICY IF EXISTS "Update AI assessments for authorized submissions" ON public.ai_assessments;
CREATE POLICY "Update AI assessments for authorized submissions"
ON public.ai_assessments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.id = ai_assessments.submission_id
      AND (
        s.student_id = auth.uid()
        OR a.teacher_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
      )
  )
);

-- 2. Perbarui policy UPDATE pada submissions agar sistem dapat memindahkan status
-- dari submitted -> processing -> awaiting_teacher_review / failed
DROP POLICY IF EXISTS "Students update own draft or revision_requested submissions" ON public.submissions;
CREATE POLICY "Students and teachers update authorized submission status"
ON public.submissions FOR UPDATE
TO authenticated
USING (
  student_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  )
)
WITH CHECK (
  student_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  )
);