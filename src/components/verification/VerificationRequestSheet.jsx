/**
 * VerificationRequestSheet — submit evidence for phone / identity / company
 * verification. Uploads an optional document to the private identity bucket and
 * records a pending request. Approval is a server/admin action; this never marks
 * the user verified.
 */
import React, { useEffect, useState } from "react";
import { submitVerification, getMyVerifications } from "../../services/verification.service.js";

const STATUS_COLOR = { pending: "#FFD23F", under_review: "#4FA3FF", approved: "#3DDC97", rejected: "#ff8a8a", not_started: "#9a968d" };

export default function VerificationRequestSheet({ lang = "mn", kind = "company", onClose }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const load = () => getMyVerifications().then((r) => setRows(r.filter((x) => x.kind === kind))).catch(() => {});
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const title = kind === "company" ? L("Компани баталгаажуулах", "Verify company")
    : kind === "identity" ? L("Иргэний үнэмлэх баталгаажуулах", "Verify identity")
    : L("Утас баталгаажуулах", "Verify phone");

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      await submitVerification({ kind, file });
      setFile(null);
      await load();
    } catch (e) {
      setError(e?.userMessage?.[lang] || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = (s) => ({ pending: L("Хүлээгдэж буй", "Pending"), under_review: L("Хянаж буй", "Under review"), approved: L("Баталгаажсан", "Approved"), rejected: L("Татгалзсан", "Rejected") }[s] || s);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "var(--bg)", display: "flex", flexDirection: "column" }} role="dialog" aria-modal="true">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--hair)" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", fontFamily: "'Barlow Condensed',sans-serif" }}>{title}</div>
        <button onClick={onClose} aria-label="Close" style={{ background: "var(--surface)", border: "none", borderRadius: 10, width: 36, height: 36, color: "var(--dim)", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5, marginBottom: 14 }}>
          {L("Нотлох баримт (бүртгэлийн гэрчилгээ, үнэмлэх г.м) хавсаргаад хүсэлт илгээнэ үү. Манай баг хянаад баталгаажуулна. Та өөрөө баталгаажуулж чадахгүй.",
             "Attach evidence (registration certificate, ID, etc.) and submit. Our team reviews and approves it — you cannot self-verify.")}
        </div>

        <label style={{ display: "block", padding: "16px", borderRadius: 14, border: "1.5px dashed var(--hair-2)", background: "var(--surface)", textAlign: "center", cursor: "pointer", color: "var(--ink)", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          {file ? `📎 ${file.name}` : L("📎 Баримт хавсаргах", "📎 Attach document")}
          <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>

        {error && <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? L("Илгээж байна…", "Submitting…") : L("Хүсэлт илгээх", "Submit request")}
        </button>

        {rows.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: "var(--dim)", fontWeight: 700, letterSpacing: 0.4, margin: "22px 0 8px" }}>{L("ХҮСЭЛТИЙН ТҮҮХ", "REQUEST HISTORY")}</div>
            {rows.map((r) => (
              <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 12, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 700 }}>{new Date(r.created_at).toLocaleDateString()}</div>
                  {r.reviewer_note && <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{r.reviewer_note}</div>}
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}1f`, border: `1px solid ${STATUS_COLOR[r.status]}55`, borderRadius: 999, padding: "2px 9px" }}>{statusLabel(r.status)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
