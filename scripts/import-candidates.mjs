#!/usr/bin/env node
/**
 * Bulk-import candidate profiles into SwipeHire (admin/seed).
 *
 * Reads a CSV of candidates and, for each row, creates an auth user
 * (password auto-generated, never printed), which fires the DB trigger that
 * creates the profiles row, then upserts a PUBLISHED candidate_profiles row so
 * the candidate shows up in the employer feed immediately.
 *
 * These are "profile-only" candidates: real accounts exist but their random
 * passwords are never distributed, so nobody logs in as them. A candidate can
 * later claim their profile via a normal password reset on their email.
 *
 * Usage (PowerShell), from the project root:
 *   $env:SUPABASE_URL="https://eltwjnnoiblmpsvensas.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role key from Supabase dashboard>"
 *   node scripts/import-candidates.mjs scripts/candidates.csv
 *
 * The service_role key bypasses RLS — keep it secret, never commit it.
 * Re-running is safe: rows whose email already exists are skipped.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// ── env (also read a local .env if present, without adding a dep) ──────────
function loadDotEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
      }
    }
  }
}
loadDotEnv();

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "✗ Missing env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  (SERVICE_ROLE key: Supabase dashboard → Project Settings → API.)"
  );
  process.exit(1);
}

const csvPath = process.argv[2] || "scripts/candidates.csv";
if (!existsSync(csvPath)) {
  console.error(`✗ CSV not found: ${csvPath}`);
  process.exit(1);
}

// ── minimal RFC-4180-ish CSV parser (quotes, commas, newlines in quotes) ───
function parseCsv(text) {
  text = text.replace(/^﻿/, ""); // strip BOM
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* ignore */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const raw = parseCsv(readFileSync(csvPath, "utf8"));
if (raw.length < 2) {
  console.error("✗ CSV has no data rows.");
  process.exit(1);
}
const header = raw[0].map((h) => h.trim().toLowerCase());
const idx = (name) => header.indexOf(name);
const need = ["full_name"];
for (const n of need) {
  if (idx(n) < 0) { console.error(`✗ CSV missing required column: ${n}`); process.exit(1); }
}

const cell = (r, name) => {
  const i = idx(name);
  return i < 0 ? "" : (r[i] ?? "").trim();
};
const intOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const genderOrNull = (v) => (["male", "female", "other"].includes(v.toLowerCase()) ? v.toLowerCase() : null);
const slug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "candidate";

const supabase = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rows = raw.slice(1);
const results = { total: rows.length, created: 0, skipped: 0, errors: [] };

console.log(`→ Importing ${rows.length} candidates into ${URL}\n`);

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const rowNo = i + 2; // header is row 1
  const fullName = cell(r, "full_name");
  if (!fullName) { results.skipped++; continue; }

  // Deterministic synthetic email when none supplied, so re-runs skip dupes.
  const email = cell(r, "email") || `seed.${rowNo}.${slug(fullName)}@import.swipehire.local`;
  const password = randomBytes(18).toString("base64url"); // never printed

  try {
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: fullName, requested_role: "candidate", seeded: true },
    });

    if (cErr) {
      // Already exists → skip (idempotent re-run). Any other error → record.
      if (/already|registered|exists/i.test(cErr.message)) { results.skipped++; continue; }
      throw cErr;
    }

    const id = created.user.id;
    const skills = cell(r, "skills")
      .split(/[;|]/).map((s) => s.trim()).filter(Boolean);

    const { error: pErr } = await supabase.from("candidate_profiles").upsert(
      {
        id,
        full_name: fullName,
        age: intOrNull(cell(r, "age")),
        gender: genderOrNull(cell(r, "gender")),
        category: cell(r, "category") || null,
        location: cell(r, "location") || null,
        phone: cell(r, "phone") || null,
        email: cell(r, "email") || null,
        about: cell(r, "about") || null,
        skills,
        salary_expectation: intOrNull(cell(r, "salary_expectation")),
        available_from: cell(r, "available_from") || null,
        published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (pErr) throw pErr;

    results.created++;
    if (results.created % 25 === 0) console.log(`  … ${results.created} created`);
  } catch (err) {
    results.errors.push({ row: rowNo, name: fullName, error: err.message || String(err) });
  }
}

writeFileSync("scripts/import-results.json", JSON.stringify(results, null, 2));
console.log(
  `\n✓ Done. created=${results.created}  skipped=${results.skipped}  errors=${results.errors.length}`
);
if (results.errors.length) {
  console.log("  See scripts/import-results.json for error detail.");
  console.log("  First error:", results.errors[0]);
}
