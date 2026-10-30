-- ============================================================================
-- MIGRATION 0007: RLS POLICIES FOR TEACHER REVIEWS, AUDIT LOGS & NOTIFICATIONS
-- Project: DesignGrade AI (Phase 5)
-- ============================================================================

-- 1. Kebijakan RLS untuk public.teacher_reviews
DROP POLICY IF EXISTS "Teachers manage reviews for own assignments, students view published reviews" ON public.teacher_reviews;

CREATE POLICY "Select teacher reviews for authorized teacher, admin, or student when published/revision"
ON public.teacher_reviews FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR (
    status IN ('published', 'revision_requested')
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = teacher_reviews.submission_id
        AND s.student_id = auth.uid()
    )
  )
);

CREATE POLICY "Teachers insert reviews for own class submissions"
ON public.teacher_reviews FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND public.get_current_user_role() IN ('teacher', 'admin')
  AND EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.id = teacher_reviews.submission_id
      AND (a.teacher_id = auth.uid() OR public.get_current_user_role() = 'admin')
  )
);

CREATE POLICY "Teachers update own reviews"
ON public.teacher_reviews FOR UPDATE
TO authenticated
USING (
  teacher_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
)
WITH CHECK (
  teacher_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
);

-- 2. Kebijakan RLS untuk public.assessment_audit_logs
DROP POLICY IF EXISTS "Teachers and admins view audit logs for managed submissions" ON public.assessment_audit_logs;
CREATE POLICY "Teachers and admins view audit logs for managed submissions"
ON public.assessment_audit_logs FOR SELECT
TO authenticated
USING (
  actor_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.assignments a ON a.id = s.assignment_id
    WHERE s.id = assessment_audit_logs.submission_id
      AND a.teacher_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Teachers and admins insert audit logs" ON public.assessment_audit_logs;
CREATE POLICY "Teachers and admins insert audit logs"
ON public.assessment_audit_logs FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND public.get_current_user_role() IN ('teacher', 'admin')
);

-- 3. Kebijakan INSERT untuk public.notifications (Saat guru menerbitkan nilai / meminta revisi)
DROP POLICY IF EXISTS "Authenticated users insert event notifications" ON public.notifications;
CREATE POLICY "Authenticated users insert event notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (
  public.get_current_user_role() IN ('teacher', 'admin', 'student')
);