/**
 * Centralised Supabase client — the ONLY place createClient() is called.
 *
 * UI components must never import @supabase/supabase-js directly; they go
 * through the service layer (auth.service, profile.service, …) which imports
 * this module. This keeps every query in one auditable place and guarantees
 * the anon key is the only key that ever reaches the browser.
 *
 * Environment:
 *   VITE_SUPABASE_URL       — project URL (public)
 *   VITE_SUPABASE_ANON_KEY  — anon/publishable key (safe for the client)
 *
 * The service-role key is NEVER referenced here. It exists only in
 * Supabase Edge Function secrets and privileged server processes.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

/** True when both public env vars are present. */
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isConfigured && import.meta.env.DEV) {
  // Loud in development, silent in production so the UI is never broken by a
  // missing env — services fall back to a clear "not configured" error.
  // eslint-disable-next-line no-console
  console.warn(
    "[SwipeHire] Supabase is not configured.\n" +
      "Copy .env.example to .env and set VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_ANON_KEY. Auth and persistence are disabled until then."
  );
}

/**
 * The shared client, or null when env is missing.
 * Services check `requireClient()` before use.
 */
export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true, // survive page refresh
        autoRefreshToken: true, // refresh before expiry
        detectSessionInUrl: true, // handle email-verify / reset redirects
        flowType: "pkce", // safer auth-code flow for SPAs
        storageKey: "swipehire.auth",
      },
      global: {
        headers: { "x-application-name": "swipehire-web" },
      },
    })
  : null;

/**
 * Returns the client or throws a typed, translatable error. Every service
 * call funnels through this so a missing config fails predictably instead
 * of throwing "cannot read property of null" deep in a query.
 */
export function requireClient() {
  if (!supabase) {
    const err = new Error("SUPABASE_NOT_CONFIGURED");
    err.code = "not_configured";
    err.userMessage = {
      mn: "Сервер тохируулагдаагүй байна. Дараа дахин оролдоно уу.",
      en: "The service is not configured. Please try again later.",
    };
    throw err;
  }
  return supabase;
}

export const SUPABASE_URL_PUBLIC = SUPABASE_URL;
