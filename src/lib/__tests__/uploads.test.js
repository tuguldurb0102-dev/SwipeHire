import { describe, it, expect } from "vitest";
import { checkUpload, UPLOAD_LIMITS } from "../uploads.js";

const f = (name, size, type) => ({ name, size, type });
const MB = 1024 * 1024;

describe("checkUpload — size limits", () => {
  it("accepts an image within the limit", () => {
    expect(checkUpload(f("a.jpg", 2 * MB, "image/jpeg"), "image", "mn").ok).toBe(true);
  });

  it("rejects an image over 5MB and names the actual size", () => {
    const r = checkUpload(f("big.jpg", 7 * MB, "image/jpeg"), "image", "mn");
    expect(r.ok).toBe(false);
    expect(r.error).toContain("7.0MB");
  });

  it("rejects a video over 50MB", () => {
    expect(checkUpload(f("v.mp4", 60 * MB, "video/mp4"), "video", "mn").ok).toBe(false);
  });

  it("rejects a document over 10MB", () => {
    expect(checkUpload(f("cv.pdf", 12 * MB, "application/pdf"), "doc", "mn").ok).toBe(false);
  });

  it("accepts a file exactly at the limit", () => {
    expect(checkUpload(f("a.jpg", UPLOAD_LIMITS.image.maxMB * MB, "image/jpeg"), "image", "mn").ok).toBe(true);
  });
});

describe("checkUpload — type restrictions", () => {
  it("rejects a disallowed MIME type", () => {
    expect(checkUpload(f("x.gif", MB, "image/gif"), "image", "mn").ok).toBe(false);
  });

  it("rejects an executable even when the MIME type looks benign", () => {
    const r = checkUpload(f("payload.exe", MB, "image/jpeg"), "image", "mn");
    expect(r.ok).toBe(false);
  });

  it.each(["a.exe", "a.bat", "a.sh", "a.apk", "a.jar", "a.msi", "a.php"])(
    "blocks %s by extension", (name) => {
      expect(checkUpload(f(name, MB, "application/pdf"), "doc", "mn").ok).toBe(false);
    });

  it("accepts a file with an empty MIME type when size and extension are fine", () => {
    // Some Android pickers report no MIME type.
    expect(checkUpload(f("photo.jpg", MB, ""), "image", "mn").ok).toBe(true);
  });
});

describe("checkUpload — messages", () => {
  it("returns Mongolian by default and English when requested", () => {
    expect(checkUpload(f("b.jpg", 9 * MB, "image/jpeg"), "image", "mn").error).toMatch(/хэт том/);
    expect(checkUpload(f("b.jpg", 9 * MB, "image/jpeg"), "image", "en").error).toMatch(/too large/);
  });

  it("handles a missing file without throwing", () => {
    expect(checkUpload(null, "image", "mn").ok).toBe(false);
  });
});
