/**
 * Client-side upload validation — pure and unit-testable.
 *
 * This is a UX guard only. The authoritative limits live in the Supabase
 * storage bucket definitions (migration 004), because a browser check can
 * always be bypassed.
 */

export const UPLOAD_LIMITS = Object.freeze({
  image: { maxMB: 5,  types: ["image/jpeg", "image/png", "image/webp", "image/heic"] },
  video: { maxMB: 50, types: ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"] },
  doc:   { maxMB: 10, types: ["application/pdf", "image/jpeg", "image/png"] },
});

/** Executables must never be accepted regardless of reported MIME type. */
export const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|sh|js|jar|apk|msi|dll|scr|com|php|py)$/i;

/**
 * @param {File|{name:string,size:number,type:string}} file
 * @param {"image"|"video"|"doc"} kind
 * @param {string} lang
 * @returns {{ok:true} | {ok:false, error:string}}
 */
export function checkUpload(file, kind, lang) {
  const L = (mn, en) => (lang === "en" || lang === "ko" ? en : mn);
  const rule = UPLOAD_LIMITS[kind];
  if (!file || !rule) return { ok: false, error: L("Файл уншиж чадсангүй", "Could not read file") };

  if (BLOCKED_EXTENSIONS.test(file.name || "")) {
    return { ok: false, error: L("Энэ төрлийн файл зөвшөөрөгдөхгүй.", "This file type is not allowed.") };
  }

  if (file.size > rule.maxMB * 1024 * 1024) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: L(
      `Файл хэт том (${mb}MB). ${rule.maxMB}MB хүртэл байх ёстой.`,
      `File too large (${mb}MB). Maximum is ${rule.maxMB}MB.`) };
  }

  // Some Android pickers report an empty MIME type; the size and extension
  // checks still applied above, so we accept rather than block a valid file.
  if (file.type && !rule.types.includes(file.type)) {
    return { ok: false, error: L("Файлын төрөл тохирохгүй байна.", "Unsupported file type.") };
  }

  return { ok: true };
}
