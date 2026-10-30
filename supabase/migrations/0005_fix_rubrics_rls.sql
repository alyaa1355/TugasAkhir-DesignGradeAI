-- ============================================================================
-- MIGRATION 0005: FIX INFINITE RECURSION ON RUBRICS & VERSIONS RLS POLICIES
-- ============================================================================

-- 1. Bersihkan policy lama pada rubrics, rubric_versions, rubric_criteria, assignment_rubrics
DROP POLICY IF EXISTS "Authenticated users can read rubrics and templates" ON public.rubrics;
DROP POLICY IF EXISTS "Teachers can create own rubrics" ON public.rubrics;
DROP POLICY IF EXISTS "Teachers can update own rubrics" ON public.rubrics;

DROP POLICY IF EXISTS "Users can view accessible rubric versions" ON public.rubric_versions;
DROP POLICY IF EXISTS "Teachers can create rubric versions for own rubrics" ON public.rubric_versions;

DROP POLICY IF EXISTS "Users can view rubric criteria for accessible versions" ON public.rubric_criteria;
DROP POLICY IF EXISTS "Teachers can insert criteria for own rubric versions" ON public.rubric_criteria;

DROP POLICY IF EXISTS "View assignment rubrics for accessible assignments" ON public.assignment_rubrics;
DROP POLICY IF EXISTS "Teachers link rubric versions to own assignments" ON public.assignment_rubrics;
DROP POLICY IF EXISTS "Teachers update rubric link on draft assignments" ON public.assignment_rubrics;

-- 2. Fungsi Helper SECURITY DEFINER (Bebas Rekursi RLS)
CREATE OR REPLACE FUNCTION public.is_rubric_owner(p_rubric_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rubrics
    WHERE id = p_rubric_id AND owner_id = auth.uid()
  );
$$;

-- 3. Policy Baru untuk public.rubrics (Tanpa mereferensikan rubric_versions)
CREATE POLICY "Read rubrics for authenticated users"
ON public.rubrics FOR SELECT
TO authenticated
USING (TRUE);

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

-- 4. Policy Baru untuk public.rubric_versions
CREATE POLICY "Read rubric versions for authenticated users"
ON public.rubric_versions FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Teachers can create rubric versions for own rubrics"
ON public.rubric_versions FOR INSERT
TO authenticated
WITH CHECK (
  public.is_rubric_owner(rubric_id)
  OR public.get_current_user_role() = 'admin'
);

-- 5. Policy Baru untuk public.rubric_criteria
CREATE POLICY "Read rubric criteria for authenticated users"
ON public.rubric_criteria FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Teachers can insert criteria for own rubric versions"
ON public.rubric_criteria FOR INSERT
TO authenticated
WITH CHECK (
  public.get_current_user_role() IN ('teacher', 'admin')
);

-- 6. Policy Baru untuk public.assignment_rubrics
CREATE POLICY "Read assignment rubrics for authenticated users"
ON public.assignment_rubrics FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "Teachers link rubric versions to own assignments"
ON public.assignment_rubrics FOR INSERT
TO authenticated
WITH CHECK (
  public.get_current_user_role() IN ('teacher', 'admin')
);

CREATE POLICY "Teachers update rubric link on own assignments"
ON public.assignment_rubrics FOR UPDATE
TO authenticated
USING (
  public.get_current_user_role() IN ('teacher', 'admin')
);