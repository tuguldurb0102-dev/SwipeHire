/**
 * Storage service — private-by-default uploads with owner-scoped paths.
 *
 * Buckets (created by migration 003):
 *   avatars       (public)   — profile photos, user-consented
 *   company-logos (public)   — employer logos
 *   videos        (private)  — video CVs
 *   cv-pdfs       (private)  — CV documents
 *   certificates  (private)  — certificates
 *   identity      (private)  — ID / verification documents (most sensitive)
 *
 * Files are stored under `<auth.uid()>/<random>.<ext>` so RLS can enforce
 * ownership by the first path segment. Private files are never exposed via a
 * public URL — the UI requests a short-lived signed URL instead.
 */
import { requireClient } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

const LIMITS = {
  avatars:      { maxMB: 5,  mime: ["image/jpeg", "image/png", "image/webp"] },
  "company-logos": { maxMB: 5, mime: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"] },
  videos:       { maxMB: 50, mime: ["video/mp4", "video/quicktime", "video/webm"] },
  "cv-pdfs":    { maxMB: 10, mime: ["application/pdf"] },
  certificates: { maxMB: 10, mime: ["application/pdf", "image/jpeg", "image/png"] },
  identity:     { maxMB: 10, mime: ["application/pdf", "image/jpeg", "image/png"] },
};

// Extensions that must never be accepted regardless of MIME.
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|js|jar|apk|msi|dll|scr|com|php|py)$/i;

function randomName(originalName) {
  const ext = (originalName.match(/\.[a-z0-9]+$/i) || [""])[0].toLowerCase();
  const rand = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return `${rand}${ext}`;
}

function validate(bucket, file) {
  const rule = LIMITS[bucket];
  if (!rule) return { ok: false, msg: { mn: "Буруу сан.", en: "Invalid bucket." } };
  if (BLOCKED_EXT.test(file.name)) return { ok: false, msg: { mn: "Энэ төрлийн файл зөвшөөрөгдөхгүй.", en: "This file type is not allowed." } };
  if (file.size > rule.maxMB * 1024 * 1024) {
    return { ok: false, msg: { mn: `Файл ${rule.maxMB}MB-ээс их байна.`, en: `File exceeds ${rule.maxMB}MB.` } };
  }
  if (file.type && !rule.mime.includes(file.type)) {
    return { ok: false, msg: { mn: "Файлын төрөл тохирохгүй.", en: "Unsupported file type." } };
  }
  return { ok: true };
}

async function uid() {
  const supabase = requireClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    const e = new Error("not_authenticated"); e.code = "not_authenticated"; e.__isServiceError = true;
    e.userMessage = { mn: "Нэвтэрнэ үү.", en: "Please sign in." };
    throw e;
  }
  return data.user.id;
}

/** Upload a file to a bucket under the caller's own prefix. */
export async function uploadFile({ bucket, file }) {
  try {
    const check = validate(bucket, file);
    if (!check.ok) {
      const e = new Error("upload_rejected"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = check.msg; throw e;
    }
    const supabase = requireClient();
    const owner = await uid();
    const path = `${owner}/${randomName(file.name)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) throw error;
    return { bucket, path };
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Public URL — only for public buckets (avatars, company-logos). */
export function getPublicUrl({ bucket, path }) {
  const supabase = requireClient();
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Short-lived signed URL for a private file. Default 5 minutes.
 * Identity documents should use the shortest practical expiry.
 */
export async function getSignedUrl({ bucket, path, expiresIn = 300 }) {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Delete one of the caller's own files. */
export async function removeFile({ bucket, path }) {
  try {
    const supabase = requireClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}
