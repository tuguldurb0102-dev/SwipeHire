/**
 * ApplicantsPanel — the employer's view of who applied to their jobs.
 *
 * Rows come from listCompanyApplications (RLS scopes them to the employer's own
 * company jobs). The employer can advance an application's status and open a
 * conversation with the applicant. Candidate names are not shown (profile RLS
 * hides other users' identities); the applicant is referenced by their
 * application + job context.
 */
import React, { useEffect, useState } from "react";
import { listCompanyApplications, setApplicationStatus } from "../../services/application.service.js";

const STATUSES = ["submitted", "reviewing", "interview", "offer", "hired", "rejected"];
const STATUS_COLOR = {
  submitted: "#9a968d", reviewing: "#4FA3FF", interview: "#FFD23F",
  offer: "#FF8A3D", hired: "#3DDC97", rejected: "#ff8a8a",
};

export default function ApplicantsPanel({ lang = "mn", onMessage, onClose }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listCompanyApplications()
      .then(setRows)
      .catch((e) => setError(e?.message || String(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const advance = async (id, status) => {
    try {
      await setApplicationStatus(id, status);
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) { setError(e?.message || String(e)); }
  };

  const label = (s) => ({
    submitted: L("Ирсэн", "Submitted"), reviewing: L("Хянаж буй", "Reviewing"),
    interview: L("Ярилцлага", "Interview"), offer: L("Санал", "Offer"),
    hired: L("Ажилд авсан", "Hired"), rejected: L("Татгалзсан", "Rejected"),
  })[s] || s;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "var(--bg)", display: "flex", flexDirection: "column" }} role="dialog" aria-modal="true">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>{L("Өргөдөл гаргагчид", "Applicants")}</div>
        <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, color: "#9a968d", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {error && <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {loading && <div style={{ color: "#9a968d", fontSize: 14, textAlign: "center", marginTop: 20 }}>…</div>}
        {!loading && rows.length === 0 && (
          <div style={{ color: "#9a968d", fontSize: 14, textAlign: "center", marginTop: 30 }}>
            {L("Өргөдөл алга. Ажлын зар нийтэлбэл өргөдөл гаргагчид эндээс харагдана.", "No applicants yet. They appear here once seekers apply to your jobs.")}
          </div>
        )}
        {rows.map((r) => (
          <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink,#f6f4ef)" }}>{r.jobs?.title || L("Ажил", "Job")}</div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLOR[r.status], background: `${STATUS_COLOR[r.status]}1f`, border: `1px solid ${STATUS_COLOR[r.status]}55`, borderRadius: 999, padding: "2px 9px" }}>{label(r.status)}</span>
            </div>
            {r.cover_letter && <div style={{ fontSize: 12.5, color: "#9a968d", marginTop: 6, lineHeight: 1.4 }}>{r.cover_letter.slice(0, 160)}</div>}
            <div style={{ fontSize: 11, color: "#6f6b63", marginTop: 6 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {STATUSES.filter((s) => s !== r.status).slice(0, 4).map((s) => (
                <button key={s} onClick={() => advance(r.id, s)} style={{ fontSize: 11.5, fontWeight: 700, color: STATUS_COLOR[s], background: "transparent", border: `1px solid ${STATUS_COLOR[s]}55`, borderRadius: 8, padding: "5px 9px", cursor: "pointer" }}>{label(s)}</button>
              ))}
              <button onClick={() => onMessage?.(r.candidate_id)} style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#FF6B35,#E85400)", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>{L("Мессеж", "Message")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
