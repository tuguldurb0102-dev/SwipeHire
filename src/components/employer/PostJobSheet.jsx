/**
 * PostJobSheet — lets an employer create a real job posting (jobs table).
 *
 * Requires a resolved companyId (jobs.company_id is NOT NULL). Uses
 * job.service.createJob; RLS ensures the caller may only post for a company
 * they own. On success the new job is active and visible to seekers.
 */
import React, { useState } from "react";
import { createJob } from "../../services/job.service.js";

export default function PostJobSheet({ lang = "mn", companyId, onClose, onPosted }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [f, setF] = useState({ title: "", category: "", location: "", description: "", salaryMin: "", salaryMax: "", headcount: "1" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      if (!companyId) throw new Error(L("Компани тодорхойлогдоогүй байна.", "No company resolved yet."));
      if (!f.title.trim()) throw new Error(L("Ажлын нэр оруулна уу.", "Please enter a job title."));
      const job = await createJob({ companyId, ...f });
      onPosted?.(job);
      onClose?.();
    } catch (err) {
      setError(err?.userMessage?.[lang] || err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  const field = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "var(--ink,#f6f4ef)", fontSize: 15, marginBottom: 10, boxSizing: "border-box" };
  const lbl = { fontSize: 12, color: "var(--dim,#9a968d)", fontWeight: 700, margin: "6px 0 4px" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column" }} role="dialog" aria-modal="true">
      <div style={{ background: "#141310", flex: 1, overflowY: "auto", padding: "0 18px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 8px" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>{L("Ажлын зар нэмэх", "Post a job")}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, color: "#9a968d", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div style={lbl}>{L("Ажлын нэр", "Job title")} *</div>
        <input style={field} value={f.title} onChange={set("title")} placeholder={L("Ж: Гагнуурчин", "e.g. Welder")} />

        <div style={lbl}>{L("Ангилал", "Category")}</div>
        <input style={field} value={f.category} onChange={set("category")} placeholder={L("Ж: Гагнуурчин", "e.g. Welder")} />

        <div style={lbl}>{L("Байршил", "Location")}</div>
        <input style={field} value={f.location} onChange={set("location")} placeholder={L("Ж: Улаанбаатар", "e.g. Ulaanbaatar")} />

        <div style={lbl}>{L("Тайлбар", "Description")}</div>
        <textarea style={{ ...field, minHeight: 90, resize: "vertical" }} value={f.description} onChange={set("description")} />

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>{L("Цалин доод", "Salary min")}</div>
            <input style={field} type="number" value={f.salaryMin} onChange={set("salaryMin")} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={lbl}>{L("Цалин дээд", "Salary max")}</div>
            <input style={field} type="number" value={f.salaryMax} onChange={set("salaryMax")} />
          </div>
        </div>

        <div style={lbl}>{L("Хүний тоо", "Headcount")}</div>
        <input style={field} type="number" min="1" value={f.headcount} onChange={set("headcount")} />

        {error && <div style={{ fontSize: 13, color: "#ff8a8a", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, padding: "10px 12px", margin: "8px 0" }}>{error}</div>}

        <button onClick={submit} disabled={busy} style={{ width: "100%", marginTop: 14, padding: "14px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? L("Нийтэлж байна…", "Posting…") : L("Нийтлэх", "Post job")}
        </button>
      </div>
    </div>
  );
}
