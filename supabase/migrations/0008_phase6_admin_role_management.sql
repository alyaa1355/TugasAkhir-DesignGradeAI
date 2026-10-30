-- ============================================================================
-- MIGRATION 0008: ADMIN USER ROLE MANAGEMENT & SYSTEM MONITORING POLICIES
-- Project: DesignGrade AI (Phase 6)
-- ============================================================================

-- Izinkan Admin memperbarui role dan status aktif pengguna di tabel profiles
DROP POLICY IF EXISTS "Admins can update any user profile and role" ON public.profiles;
CREATE POLICY "Admins can update any user profile and role"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');