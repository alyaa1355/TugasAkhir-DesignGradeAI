-- ============================================================================
-- MIGRATION 0001: INITIAL SCHEMA, ENUMS, TRIGGERS, INDEXES & RLS POLICIES
-- Project: DesignGrade AI
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES
CREATE TYPE public.user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE public.class_member_status AS ENUM ('active', 'inactive', 'removed');
CREATE TYPE public.assignment_status AS ENUM ('draft', 'published', 'archived', 'closed');
CREATE TYPE public.design_type AS ENUM (
  'mobile_app_ui',
  'web_dashboard_ui',
  'wireframe',
  'high_fidelity_mockup',
  'design_system',
  'prototype',
  'ux_flow',
  'other'
);
CREATE TYPE public.submission_status AS ENUM (
  'draft',
  'submitted',
  'processing',
  'awaiting_teacher_review',
  'revision_requested',
  'graded',
  'failed'
);
CREATE TYPE public.asset_type AS ENUM ('image', 'figma_link', 'supporting_screenshot');
CREATE TYPE public.ai_assessment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'incomplete_evidence',
  'failed'
);
CREATE TYPE public.teacher_review_status AS ENUM (
  'draft',
  'revision_requested',
  'finalized',
  'published'
);

-- 2. HELPER FUNCTION FOR UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. CORE TABLES

-- 3.1 profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role public.user_role NOT NULL DEFAULT 'student',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger otomatis membuat profil saat user baru mendaftar di auth.users.
-- Keamanan: Pendaftaran publik SELALU ditetapkan sebagai 'student'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'student'::public.user_role
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.2 classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  join_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.3 class_members
CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status public.class_member_status NOT NULL DEFAULT 'active',
  UNIQUE (class_id, student_id)
);

-- 3.4 rubrics
CREATE TABLE public.rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_rubrics_updated_at
BEFORE UPDATE ON public.rubrics
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.5 rubric_versions (Immutable snapshot ketika tugas dipublikasikan)
CREATE TABLE public.rubric_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES public.rubrics(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number >= 1),
  criteria_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_weight NUMERIC(5,2) NOT NULL CHECK (total_weight = 100.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rubric_id, version_number)
);

-- 3.6 rubric_criteria
CREATE TABLE public.rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_version_id UUID NOT NULL REFERENCES public.rubric_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL CHECK (weight > 0 AND weight <= 100),
  performance_descriptors JSONB NOT NULL DEFAULT '{}'::jsonb,
  assessment_guidance TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3.7 assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_objectives TEXT NOT NULL,
  design_brief TEXT NOT NULL,
  instructions TEXT,
  design_type public.design_type NOT NULL DEFAULT 'mobile_app_ui',
  target_platform TEXT NOT NULL DEFAULT 'mobile',
  target_user TEXT,
  allowed_submission_types TEXT[] NOT NULL DEFAULT ARRAY['image', 'figma'],
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  deadline TIMESTAMPTZ NOT NULL,
  late_submission_policy TEXT NOT NULL DEFAULT 'allow_with_flag',
  show_ai_score_before_review BOOLEAN NOT NULL DEFAULT FALSE,
  allow_revision BOOLEAN NOT NULL DEFAULT TRUE,
  status public.assignment_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.8 assignment_rubrics
CREATE TABLE public.assignment_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL UNIQUE REFERENCES public.assignments(id) ON DELETE CASCADE,
  rubric_version_id UUID NOT NULL REFERENCES public.rubric_versions(id) ON DELETE RESTRICT
);

-- 3.9 submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  status public.submission_status NOT NULL DEFAULT 'draft',
  submission_note TEXT,
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id, version_number)
);

CREATE TRIGGER set_submissions_updated_at
BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.10 submission_assets
CREATE TABLE public.submission_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  asset_type public.asset_type NOT NULL,
  storage_path TEXT,
  figma_url TEXT,
  mime_type TEXT,
  file_size BIGINT CHECK (file_size IS NULL OR file_size > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 ai_assessments
CREATE TABLE public.ai_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  rubric_version_id UUID NOT NULL REFERENCES public.rubric_versions(id) ON DELETE RESTRICT,
  model_name TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1.0',
  status public.ai_assessment_status NOT NULL DEFAULT 'pending',
  criteria_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_score NUMERIC(5,2) CHECK (calculated_score IS NULL OR (calculated_score >= 0 AND calculated_score <= 100)),
  summary TEXT,
  error_code TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3.12 teacher_reviews
CREATE TABLE public.teacher_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  ai_assessment_id UUID REFERENCES public.ai_assessments(id) ON DELETE SET NULL,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  criterion_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_score NUMERIC(5,2) CHECK (final_score IS NULL OR (final_score >= 0 AND final_score <= 100)),
  teacher_feedback TEXT,
  revision_reason TEXT,
  revision_deadline TIMESTAMPTZ,
  status public.teacher_review_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_teacher_reviews_updated_at
BEFORE UPDATE ON public.teacher_reviews
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3.13 assessment_audit_logs
CREATE TABLE public.assessment_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  previous_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.14 notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX idx_class_members_student_id ON public.class_members(student_id);
CREATE INDEX idx_class_members_class_id ON public.class_members(class_id);
CREATE INDEX idx_assignments_class_id ON public.assignments(class_id);
CREATE INDEX idx_assignments_teacher_id ON public.assignments(teacher_id);
CREATE INDEX idx_assignments_status ON public.assignments(status);
CREATE INDEX idx_submissions_assignment_id ON public.submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON public.submissions(student_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_ai_assessments_submission_id ON public.ai_assessments(submission_id);
CREATE INDEX idx_teacher_reviews_submission_id ON public.teacher_reviews(submission_id);
CREATE INDEX idx_notifications_user_id_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- 5. ROW LEVEL SECURITY (RLS) HELPERS & POLICIES

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rubric_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5.1 Policies for profiles
CREATE POLICY "Users can view own profile or teachers/admins view relevant profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.get_current_user_role() IN ('teacher', 'admin')
);

-- Pengguna hanya dapat mengubah nama dan avatar miliknya sendiri, TIDAK boleh mengubah role.
CREATE POLICY "Users can update own basic profile without changing role"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- 5.2 Policies for classes
CREATE POLICY "Teachers view own classes, students view enrolled classes, admins view all"
ON public.classes FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.class_members cm
    WHERE cm.class_id = classes.id
      AND cm.student_id = auth.uid()
      AND cm.status = 'active'
  )
);

CREATE POLICY "Teachers can create classes"
ON public.classes FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND public.get_current_user_role() IN ('teacher', 'admin')
);

CREATE POLICY "Teachers can update own classes"
ON public.classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid() OR public.get_current_user_role() = 'admin')
WITH CHECK (teacher_id = auth.uid() OR public.get_current_user_role() = 'admin');

-- 5.3 Policies for class_members
CREATE POLICY "View class memberships for own classes or self"
ON public.class_members FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_members.class_id AND c.teacher_id = auth.uid()
  )
);

-- 5.4 Policies for assignments
CREATE POLICY "Teachers manage own class assignments, students read published assignments"
ON public.assignments FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR (
    status IN ('published', 'closed')
    AND EXISTS (
      SELECT 1 FROM public.class_members cm
      WHERE cm.class_id = assignments.class_id
        AND cm.student_id = auth.uid()
        AND cm.status = 'active'
    )
  )
);

CREATE POLICY "Teachers insert assignments for own classes"
ON public.assignments FOR INSERT
TO authenticated
WITH CHECK (
  teacher_id = auth.uid()
  AND public.get_current_user_role() = 'teacher'
  AND EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = assignments.class_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers update own assignments"
ON public.assignments FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- 5.5 Policies for submissions
CREATE POLICY "Students access own submissions, teachers access class submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (
  student_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  )
);

CREATE POLICY "Students create own submissions in enrolled classes"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.get_current_user_role() = 'student'
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    JOIN public.class_members cm ON cm.class_id = a.class_id
    WHERE a.id = submissions.assignment_id
      AND cm.student_id = auth.uid()
      AND cm.status = 'active'
      AND a.status = 'published'
  )
);

CREATE POLICY "Students update own draft or revision_requested submissions"
ON public.submissions FOR UPDATE
TO authenticated
USING (
  student_id = auth.uid()
  AND status IN ('draft', 'revision_requested')
)
WITH CHECK (
  student_id = auth.uid()
  AND status IN ('draft', 'submitted')
);

-- 5.6 Policies for teacher_reviews
CREATE POLICY "Teachers manage reviews for own assignments, students view published reviews"
ON public.teacher_reviews FOR SELECT
TO authenticated
USING (
  teacher_id = auth.uid()
  OR public.get_current_user_role() = 'admin'
  OR (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = teacher_reviews.submission_id AND s.student_id = auth.uid()
    )
  )
);

-- 5.7 Policies for notifications
CREATE POLICY "Users view and update own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users mark own notifications as read"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());