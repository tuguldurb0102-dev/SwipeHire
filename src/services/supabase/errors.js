/**
 * Normalises Supabase / network errors into a stable shape the UI can render
 * in Mongolian with an English fallback. Services never leak raw Postgres or
 * GoTrue strings to the user.
 */

const MESSAGES = {
  not_configured:      { mn: "Сервер тохируулагдаагүй байна.", en: "Service is not configured." },
  invalid_credentials: { mn: "Имэйл эсвэл нууц үг буруу байна.", en: "Incorrect email or password." },
  email_taken:         { mn: "Энэ имэйл аль хэдийн бүртгэлтэй байна.", en: "This email is already registered." },
  email_not_confirmed: { mn: "Имэйлээ баталгаажуулна уу. Бид линк илгээсэн.", en: "Please confirm your email — we sent a link." },
  weak_password:       { mn: "Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.", en: "Password must be at least 8 characters." },
  rate_limited:        { mn: "Хэт олон удаа оролдлоо. Түр хүлээгээд дахин оролдоно уу.", en: "Too many attempts. Please wait and try again." },
  not_authenticated:   { mn: "Нэвтэрнэ үү.", en: "Please sign in." },
  forbidden:           { mn: "Танд энэ үйлдэл хийх эрх байхгүй.", en: "You don't have permission for this action." },
  network:             { mn: "Сүлжээний алдаа. Холболтоо шалгана уу.", en: "Network error. Check your connection." },
  unknown:             { mn: "Алдаа гарлаа. Дахин оролдоно уу.", en: "Something went wrong. Please try again." },
};

/** Maps a raw error to a stable code. */
function classify(err) {
  if (!err) return "unknown";
  if (err.code === "not_configured") return "not_configured";
  const msg = (err.message || err.error_description || "").toLowerCase();
  const status = err.status || err.statusCode;

  if (msg.includes("already registered") || msg.includes("already been registered") || err.code === "23505") return "email_taken";
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) return "invalid_credentials";
  if (msg.includes("email not confirmed")) return "email_not_confirmed";
  if (msg.includes("password") && msg.includes("least")) return "weak_password";
  if (status === 429 || msg.includes("rate limit")) return "rate_limited";
  if (status === 401 || msg.includes("jwt") || msg.includes("not authenticated")) return "not_authenticated";
  if (status === 403 || msg.includes("row-level security") || msg.includes("permission denied")) return "forbidden";
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) return "network";
  return "unknown";
}

/**
 * Wrap a raw error into { code, userMessage:{mn,en}, cause }.
 * Never throws; safe to call with anything.
 */
export function toServiceError(err) {
  if (err && err.__isServiceError) return err;
  const code = classify(err);
  const e = new Error(code);
  e.__isServiceError = true;
  e.code = code;
  e.userMessage = MESSAGES[code] || MESSAGES.unknown;
  e.cause = err;
  return e;
}

/** Pick the localized string for the active language. */
export function errorText(serviceError, lang = "mn") {
  const m = (serviceError && serviceError.userMessage) || MESSAGES.unknown;
  return lang === "mn" ? m.mn : m.en;
}
