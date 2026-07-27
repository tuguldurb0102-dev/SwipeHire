/**
 * Authentication service — the only module the UI uses for auth.
 *
 * Wraps Supabase GoTrue. Every function returns a plain result or throws a
 * normalised service error (see errors.js). No Supabase types leak upward.
 *
 * Age (18+) and consent are enforced here at the boundary AND by database
 * constraints; the client check is a UX gate, not the security boundary.
 */
import { requireClient, isConfigured } from "./supabase/client.js";
import { toServiceError } from "./supabase/errors.js";

const MIN_AGE = 18;
const ALLOWED_ROLES = ["candidate", "employer"]; // "admin" is never self-assigned

/**
 * Create an account.
 * @param {object} p
 * @param {string} p.email
 * @param {string} p.password
 * @param {"candidate"|"employer"} p.role
 * @param {boolean} p.is18Plus         must be true
 * @param {string}  [p.redirectTo]     email-confirm return URL
 * @returns {Promise<{user:object|null, session:object|null, needsEmailConfirm:boolean}>}
 */
export async function signUp({ email, password, role, is18Plus, redirectTo }) {
  try {
    if (!is18Plus) {
      const e = new Error("age_gate"); e.code = "forbidden";
      e.__isServiceError = true;
      e.userMessage = { mn: "Та 18 нас хүрсэн байх шаардлагатай.", en: "You must be at least 18 years old." };
      throw e;
    }
    if (!ALLOWED_ROLES.includes(role)) {
      const e = new Error("bad_role"); e.code = "unknown"; e.__isServiceError = true;
      e.userMessage = { mn: "Буруу үүрэг сонголт.", en: "Invalid role selection." };
      throw e;
    }
    if (!password || password.length < 8) {
      throw toServiceError({ message: "password at least 8" });
    }

    const supabase = requireClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: redirectTo,
        // Metadata is a HINT only. The DB trigger validates role against a
        // check constraint and never trusts is18Plus from the client for
        // anything security-relevant.
        data: { requested_role: role, age_confirmed: true },
      },
    });
    if (error) throw error;

    return {
      user: data.user ?? null,
      session: data.session ?? null,
      needsEmailConfirm: Boolean(data.user && !data.session),
    };
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Sign in with email + password. */
export async function signIn({ email, password }) {
  try {
    const supabase = requireClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
    return { user: data.user, session: data.session };
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Sign out the current user. */
export async function signOut() {
  try {
    const supabase = requireClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Send a password-reset email. */
export async function resetPassword({ email, redirectTo }) {
  try {
    const supabase = requireClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Set a new password (used on the reset-redirect page while a recovery
 *  session is active). */
export async function updatePassword({ newPassword }) {
  try {
    if (!newPassword || newPassword.length < 8) {
      throw toServiceError({ message: "password at least 8" });
    }
    const supabase = requireClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Resend the confirmation email. */
export async function resendConfirmation({ email, redirectTo }) {
  try {
    const supabase = requireClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
    return true;
  } catch (err) {
    throw toServiceError(err);
  }
}

/** Current session, or null. Used to restore auth on app start. */
export async function getSession() {
  if (!isConfigured) return null;
  try {
    const supabase = requireClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session ?? null;
  } catch (err) {
    throw toServiceError(err);
  }
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function so the
 * caller can clean up and avoid duplicate listeners.
 */
export function onAuthStateChange(handler) {
  if (!isConfigured) return () => {};
  const supabase = requireClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    handler(session, _event);
  });
  return () => data.subscription.unsubscribe();
}
