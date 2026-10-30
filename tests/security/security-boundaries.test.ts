import { describe, it, expect } from "vitest";
import {
  isValidFigmaUrl,
  verifyImageMagicBytes,
} from "@/lib/validation/submission";
import { buildSafeSubmissionStoragePath } from "@/lib/supabase/storage";

describe("1. Proteksi SSRF & Allowlist URL Figma", () => {
  it("mengizinkan URL resmi Figma dengan protokol HTTPS dan path desain/prototype", () => {
    expect(
      isValidFigmaUrl("https://www.figma.com/design/AbCdEf12345/Mobile-Checkout")
    ).toBe(true);
    expect(
      isValidFigmaUrl("https://figma.com/proto/XyZ987654/Interactive-Flow")
    ).toBe(true);
  });

  it("menolak URL non-HTTPS, localhost/internal IP (SSRF), atau domain di luar figma.com", () => {
    expect(
      isValidFigmaUrl("http://www.figma.com/design/AbCdEf12345/Insecure-Http")
    ).toBe(false);
    expect(isValidFigmaUrl("http://127.0.0.1:8080/admin")).toBe(false);
    expect(isValidFigmaUrl("http://169.254.169.254/latest/meta-data/")).toBe(
      false
    );
    expect(
      isValidFigmaUrl("https://evil-phishing.com/figma.com/design/12345")
    ).toBe(false);
  });
});

describe("2. Validasi Magic Bytes File Gambar Server-Side", () => {
  it("menerima header biner PNG asli", () => {
    const pngHeader = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const check = verifyImageMagicBytes(pngHeader, "image/png");
    expect(check.valid).toBe(true);
    expect(check.detectedExt).toBe("png");
  });

  it("menolak file script/HTML berbahaya yang disamarkan dengan MIME image/png", () => {
    const fakeScriptBytes = new TextEncoder().encode(
      "<script>alert('xss')</script>"
    );
    const check = verifyImageMagicBytes(fakeScriptBytes, "image/png");
    expect(check.valid).toBe(false);
    expect(check.detectedExt).toBeNull();
  });
});

describe("3. Isolasi Path Penyimpanan Privat Siswa", () => {
  it("menghasilkan path terisolasi dengan UUID acak dan mengabaikan nama file input pengguna", () => {
    const pathA = buildSafeSubmissionStoragePath({
      classId: "class-111",
      assignmentId: "assign-222",
      studentId: "student-333",
      versionNumber: 1,
      extension: "png",
    });

    const pathB = buildSafeSubmissionStoragePath({
      classId: "class-111",
      assignmentId: "assign-222",
      studentId: "student-333",
      versionNumber: 1,
      extension: "png",
    });

    expect(pathA).toMatch(
      /^class-111\/assign-222\/student-333\/v1\/[0-9a-f-]+\.png$/
    );
    // Pastikan dua upload berbeda menghasilkan UUID unik yang tidak dapat ditebak
    expect(pathA).not.toBe(pathB);
  });
});