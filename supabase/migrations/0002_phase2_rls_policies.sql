-- ============================================================================
-- MIGRATION 0002: COMPLETE RLS POLICIES FOR CLASSES, RUBRICS & ASSIGNMENTS
-- Project: DesignGrade AI (Phase 2)
-- ============================================================================

-- 1. Policies untuk class_members (Enrollment Siswa & Pengelolaan Guru)
CREATE POLICY "Students can enroll themselves into active classes"
ON public.class_members FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.get_current_user_role() = 'student'
);

CREATE POLICY "Teachers can manage members in their own classes"
ON public.class_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid()
  )
);

-- Fungsi RPC Security Definer untuk mencari dan bergabung ke kelas via join_code
-- Mencegah siswa melakukan enumerasi seluruh daftar kelas yang tidak diikuti.
CREATE OR REPLACE FUNCTION public.join_class_by_code(p_join_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class_id UUID;
  v_user_role public.user_role;
BEGIN
  SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
  IF v_user_role IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'Hanya akun siswa yang dapat bergabung ke kelas melalui kode undangan.';
  END IF;

  SELECT id INTO v_class_id
  FROM public.classes
  WHERE UPPER(TRIM(join_code)) = UPPER(TRIM(p_join_code));

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Kode kelas tidak ditemukan. Periksa kembali kode dari pengajar Anda.';
  END IF;

  INSERT INTO public.class_members (class_id, student_id, status)
  VALUES (v_class_id, auth.uid(), 'active')
  ON CONFLICT (class_id, student_id)
  DO UPDATE SET status = 'active';

  RETURN v_class_id;
END;
$$;

-- 2. Policies untuk rubrics
CREATE POLICY "Authenticated users can read rubrics and templates"
ON public.rubrics FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR is_template = TRUE
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.rubric_versions rv
    JOIN public.assignment_rubrics ar ON ar.rubric_version_id = rv.id
    JOIN public.assignments a ON a.id = ar.assignment_id
    JOIN public.class_members cm ON cm.class_id = a.class_id
    WHERE rv.rubric_id = rubrics.id
      AND cm.student_id = auth.uid()
      AND cm.status = 'active'
  )
);

CREATE POLICY "Teachers can create own rubrics"
ON public.rubrics FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
  AND public.get_current_user_role() IN ('teacher', 'admin')
);

CREATE POLICY "Teachers can update own rubrics"
ON public.rubrics FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 3. Policies untuk rubric_versions
CREATE POLICY "Users can view accessible rubric versions"
ON public.rubric_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rubrics r
    WHERE r.id = rubric_versions.rubric_id
      AND (r.owner_id = auth.uid() OR r.is_template = TRUE)
  )
  OR EXISTS (
    SELECT 1 FROM public.assignment_rubrics ar
    JOIN public.assignments a ON a.id = ar.assignment_id
    JOIN public.class_members cm ON cm.class_id = a.class_id
    WHERE ar.rubric_version_id = rubric_versions.id
      AND cm.student_id = auth.uid()
      AND cm.status = 'active'
  )
  OR public.get_current_user_role() = 'admin'
);

CREATE POLICY "Teachers can create rubric versions for own rubrics"
ON public.rubric_versions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rubrics r
    WHERE r.id = rubric_versions.rubric_id AND r.owner_id = auth.uid()
  )
);

-- 4. Policies untuk rubric_criteria
CREATE POLICY "Users can view rubric criteria for accessible versions"
ON public.rubric_criteria FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.rubric_versions rv
    WHERE rv.id = rubric_criteria.rubric_version_id
  )
);

CREATE POLICY "Teachers can insert criteria for own rubric versions"
ON public.rubric_criteria FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.rubric_versions rv
    JOIN public.rubrics r ON r.id = rv.rubric_id
    WHERE rv.id = rubric_criteria.rubric_version_id
      AND r.owner_id = auth.uid()
  )
);

-- 5. Policies untuk assignment_rubrics
CREATE POLICY "View assignment rubrics for accessible assignments"
ON public.assignment_rubrics FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_rubrics.assignment_id
  )
);

CREATE POLICY "Teachers link rubric versions to own assignments"
ON public.assignment_rubrics FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_rubrics.assignment_id
      AND a.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers update rubric link on draft assignments"
ON public.assignment_rubrics FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_rubrics.assignment_id
      AND a.teacher_id = auth.uid()
  )
);