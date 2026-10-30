-- ============================================================================
-- DEVELOPMENT SEED DATA (KHUSUS LINGKUNGAN PENGEMBANGAN LOKAL)
-- Jangan dijalankan pada database Production!
-- ============================================================================

DO $$
DECLARE
  v_teacher_id UUID;
  v_class_id UUID;
  v_rubric_id UUID;
  v_version_id UUID;
  v_assignment_id UUID;
BEGIN
  -- Cari satu akun dengan role 'teacher' yang sudah ada di lokal
  SELECT id INTO v_teacher_id
  FROM public.profiles
  WHERE role = 'teacher'
  LIMIT 1;

  IF v_teacher_id IS NULL THEN
    RAISE NOTICE 'Lewati seed: Belum ada akun berstatus teacher di public.profiles.';
    RETURN;
  END IF;

  -- 1. Buat Kelas Contoh Development
  INSERT INTO public.classes (name, description, teacher_id, join_code)
  VALUES (
    '[DEV SEED] XII PPLG — Studio Desain Antarmuka',
    'Kelas demonstrasi khusus pengembangan lokal DesignGrade AI.',
    v_teacher_id,
    'DG-DEV001'
  )
  ON CONFLICT (join_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_class_id;

  -- 2. Buat Rubrik Contoh Development
  INSERT INTO public.rubrics (owner_id, title, description, is_template)
  VALUES (
    v_teacher_id,
    '[DEV SEED] Rubrik Evaluasi Mobile App UI/UX',
    'Rubrik contoh untuk pengujian pengembangan lokal.',
    TRUE
  )
  RETURNING id INTO v_rubric_id;

  INSERT INTO public.rubric_versions (rubric_id, version_number, total_weight, criteria_snapshot)
  VALUES (
    v_rubric_id,
    1,
    100.00,
    '[]'::jsonb
  )
  RETURNING id INTO v_version_id;

  INSERT INTO public.rubric_criteria (rubric_version_id, name, description, weight, sort_order, assessment_guidance)
  VALUES
    (v_version_id, 'Hierarki Visual & Layout', 'Kejelasan fokus utama dan konsistensi spasi.', 35, 1, 'Amati ukuran heading, kontras tombol utama, dan jarak antar-elemen.'),
    (v_version_id, 'Tipografi & Keterbacaan', 'Keterbacaan ukuran teks pada viewport mobile.', 30, 2, 'Periksa skala ukuran font dan kontras teks terhadap latar.'),
    (v_version_id, 'Kesesuaian dengan Brief', 'Kelengkapan komponen wajib sesuai skenario tugas.', 35, 3, 'Pastikan seluruh elemen yang diminta pada brief hadir di layar.');

  -- 3. Buat Tugas Contoh Development
  INSERT INTO public.assignments (
    class_id,
    teacher_id,
    title,
    description,
    learning_objectives,
    design_brief,
    design_type,
    target_platform,
    deadline,
    status,
    show_ai_score_before_review,
    published_at
  )
  VALUES (
    v_class_id,
    v_teacher_id,
    '[DEV SEED] Desain Layar Pendaftaran Pasien Klinik Mobile',
    'Tugas pengembangan lokal untuk menguji alur pengumpulan dan evaluasi rubrik.',
    'Siswa mampu menyusun hierarki informasi formulir medis yang jelas dan ramah pengguna.',
    'Rancang 1 layar utama pendaftaran antrean klinik pada perangkat mobile yang memuat pilihan poli, jadwal dokter, dan tombol konfirmasi.',
    'mobile_app_ui',
    'Mobile (iOS / Android)',
    NOW() + INTERVAL '14 days',
    'published',
    TRUE,
    NOW()
  )
  RETURNING id INTO v_assignment_id;

  INSERT INTO public.assignment_rubrics (assignment_id, rubric_version_id)
  VALUES (v_assignment_id, v_version_id);

  RAISE NOTICE 'Seed data development berhasil dibuat dengan kode kelas: DG-DEV001';
END $$;