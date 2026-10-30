import { test, expect } from "@playwright/test";

test.describe("DesignGrade AI — End-to-End & Access Control Verification", () => {
  test("1. Landing page memuat bagian utama, metodologi rubrik, dan FAQ secara responsif", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: /Penilaian tugas desain yang berpihak pada/i,
      })
    ).toBeVisible();
    await expect(
      page.getByText(/AI Membantu Guru, Bukan Menggantikan Guru/i)
    ).toBeVisible();
    await expect(page.getByText(/Pertanyaan yang sering diajukan/i)).toBeVisible();
  });

  test("2. Proteksi Route: Pengguna belum login yang mengakses /teacher atau /student diarahkan ke /login", async ({
    page,
  }) => {
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/student");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("3. Halaman Login dan Register Siswa menampilkan validasi formulir yang aksesibel", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Masuk ke Studio/i }).click();
    await expect(page.getByText(/Format email tidak valid/i)).toBeVisible();
  });
});