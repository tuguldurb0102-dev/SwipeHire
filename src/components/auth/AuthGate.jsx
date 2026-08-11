/**
 * AuthGate — real sign in / sign up / password reset for SwipeHire.
 *
 * Uses the framework-agnostic auth.service (Supabase). It does not manage the
 * session itself: on success the app's onAuthStateChange listener picks up the
 * new session and moves past the gate. This component only drives the forms.
 *
 * Shown only when Supabase is configured AND there is no session. When Supabase
 * is not configured (e.g. the public demo build), the app keeps its demo flow
 * and this gate never renders — so the demo is never broken.
 */
import React, { useState } from "react";
import { signIn, signUp, resetPassword } from "../../services/auth.service.js";

export default function AuthGate({ lang = "mn" }) {
  const L = (mn, en) => (lang === "en" ? en : mn);

  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleChoice, setRoleChoice] = useState("candidate"); // candidate | employer
  const [age18, setAge18] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const msg = (err) => err?.userMessage?.[lang] || err?.userMessage?.mn || err?.message || String(err);

  const submit = async () => {
    setBusy(true); setError(null); setInfo(null);
    try {
      if (mode === "reset") {
        await resetPassword({ email, redirectTo: window.location.origin });
        setInfo(L("Нууц үг сэргээх холбоосыг имэйлээр илгээлээ.", "Password reset link sent to your email."));
      } else if (mode === "signup") {
        const res = await signUp({
          email, password, role: roleChoice, is18Plus: age18,
          redirectTo: window.location.origin,
        });
        if (res.needsEmailConfirm) {
          setInfo(L("Имэйлээ шалгаж баталгаажуулна уу.", "Please check your email to confirm your account."));
        }
        // else: session created → app listener continues past the gate.
      } else {
        await signIn({ email, password });
        // app listener continues past the gate.
      }
    } catch (err) {
      setError(msg(err));
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    email.includes("@") &&
    (mode === "reset" || password.length >= 8) &&
    (mode !== "signup" || age18);

  const S = {
    wrap: { minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px", maxWidth: 440, margin: "0 auto" },
    field: { width: "100%", padding: "13px 14px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--ink,#f6f4ef)", fontSize: 15, marginBottom: 12, boxSizing: "border-box" },
    primary: { width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: canSubmit && !busy ? "pointer" : "not-allowed", opacity: canSubmit && !busy ? 1 : 0.5 },
    link: { background: "none", border: "none", color: "#FF8A3D", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 4 },
    tab: (on) => ({ flex: 1, padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, background: on ? "rgba(255,107,53,0.15)" : "transparent", color: on ? "#FF6B35" : "var(--dim,#9a968d)" }),
  };

  return (
    <div style={S.wrap}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#FF6B35,#E85400)", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 28 }}>🎯</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>SwipeHire</div>
        <div style={{ fontSize: 13, color: "var(--dim,#9a968d)", marginTop: 4 }}>
          {mode === "signup" ? L("Шинэ бүртгэл үүсгэх", "Create your account")
            : mode === "reset" ? L("Нууц үг сэргээх", "Reset your password")
            : L("Тавтай морил", "Welcome back")}
        </div>
      </div>

      {mode !== "reset" && (
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 4, marginBottom: 16 }}>
          <button style={S.tab(mode === "signin")} onClick={() => { setMode("signin"); setError(null); setInfo(null); }}>{L("Нэвтрэх", "Sign in")}</button>
          <button style={S.tab(mode === "signup")} onClick={() => { setMode("signup"); setError(null); setInfo(null); }}>{L("Бүртгүүлэх", "Sign up")}</button>
        </div>
      )}

      <input style={S.field} type="email" autoComplete="email" placeholder={L("Имэйл", "Email")}
        value={email} onChange={(e) => setEmail(e.target.value)} />

      {mode !== "reset" && (
        <input style={S.field} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder={L("Нууц үг (8+ тэмдэгт)", "Password (8+ characters)")}
          value={password} onChange={(e) => setPassword(e.target.value)} />
      )}

      {mode === "signup" && (
        <>
          <div style={{ fontSize: 12, color: "var(--dim,#9a968d)", fontWeight: 700, margin: "4px 0 8px" }}>{L("Та хэн бэ?", "Who are you?")}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["candidate", L("Ажил хайгч", "Job seeker")], ["employer", L("Ажил олгогч", "Employer")]].map(([val, label]) => (
              <button key={val} onClick={() => setRoleChoice(val)} style={{
                flex: 1, padding: "12px", borderRadius: 12, cursor: "pointer", fontWeight: 800, fontSize: 14,
                border: `1.5px solid ${roleChoice === val ? "#FF6B35" : "rgba(255,255,255,0.12)"}`,
                background: roleChoice === val ? "rgba(255,107,53,0.1)" : "transparent",
                color: roleChoice === val ? "#FF6B35" : "var(--ink,#f6f4ef)",
              }}>{label}</button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={age18} onChange={(e) => setAge18(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13, color: "var(--ink-2,#d6d2c9)", lineHeight: 1.5 }}>
              {L("Би 18 нас хүрсэн бөгөөд Үйлчилгээний нөхцөл, Нууцлалын бодлогыг зөвшөөрч байна.",
                 "I am at least 18 and accept the Terms of Service and Privacy Policy.")}
            </span>
          </label>
        </>
      )}

      {error && <div style={{ fontSize: 13, color: "#ff8a8a", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>{error}</div>}
      {info && <div style={{ fontSize: 13, color: "#3DDC97", background: "rgba(61,220,151,0.08)", border: "1px solid rgba(61,220,151,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>{info}</div>}

      <button style={S.primary} disabled={!canSubmit || busy} onClick={submit}>
        {busy ? L("Түр хүлээнэ үү…", "Please wait…")
          : mode === "signup" ? L("Бүртгүүлэх", "Create account")
          : mode === "reset" ? L("Холбоос илгээх", "Send reset link")
          : L("Нэвтрэх", "Sign in")}
      </button>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        {mode === "signin" && (
          <button style={S.link} onClick={() => { setMode("reset"); setError(null); setInfo(null); }}>
            {L("Нууц үгээ мартсан уу?", "Forgot password?")}
          </button>
        )}
        {mode === "reset" && (
          <button style={S.link} onClick={() => { setMode("signin"); setError(null); setInfo(null); }}>
            {L("← Нэвтрэх рүү буцах", "← Back to sign in")}
          </button>
        )}
      </div>
    </div>
  );
}
