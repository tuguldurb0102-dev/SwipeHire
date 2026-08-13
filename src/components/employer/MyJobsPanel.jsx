/**
 * MyJobsPanel — the employer's own job listings with lifecycle control.
 *
 * Lists jobs via listMyJobs (RLS-scoped) and lets the employer move each job
 * through active / paused / closed via job.service.updateJob. Only active jobs
 * are visible to seekers, so pausing/closing removes a job from the feed.
 */
import React, { useEffect, useState } from "react";
import { listMyJobs, updateJob } from "../../services/job.service.js";

const STATUS = ["active", "paused", "closed"];
const COLOR = { active: "#3DDC97", paused: "#FFD23F", closed: "#9a968d" };

export default function MyJobsPanel({ lang = "mn", onClose }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listMyJobs().then(setRows).catch((e) => setError(e?.message || String(e))).finally(() => setLoading(false));
  }, []);

  const setStatus = async (id, status) => {
    try {
      await updateJob(id, { status });
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch (e) { setError(e?.message || String(e)); }
  };

  const label = (s) => ({ active: L("Идэвхтэй", "Active"), paused: L("Түр зогссон", "Paused"), closed: L("Хаагдсан", "Closed") }[s] || s);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "var(--bg)", display: "flex", flexDirection: "column" }} role="dialog" aria-modal="true">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", borderBottom: "1px solid var(--hair)" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", fontFamily: "'Barlow Condensed',sans-serif" }}>{L("Миний зарууд", "My Jobs")}</div>
        <button onClick={onClose} aria-label="Close" style={{ background: "var(--surface)", border: "none", borderRadius: 10, width: 36, height: 36, color: "var(--dim)", cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
        {error && <div style={{ color: "#ff8a8a", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        {loading && <div style={{ color: "var(--dim)", fontSize: 14, textAlign: "center", padding: 20 }}>…</div>}
        {!loading && rows.length === 0 && (
          <div style={{ color: "var(--dim)", fontSize: 14, textAlign: "center", padding: 30 }}>
            {L("Зар алга. ＋ товчоор ажлын зар нэмээрэй.", "No jobs yet. Add one with the ＋ button.")}
          </div>
        )}
        {rows.map((j) => (
          <div key={j.id} style={{ background: "var(--surface)", border: "1px solid var(--hair)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{j.title}</div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: COLOR[j.status], background: `${COLOR[j.status]}1f`, border: `1px solid ${COLOR[j.status]}55`, borderRadius: 999, padding: "2px 9px" }}>{label(j.status)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 4 }}>{j.category || "—"}{j.location ? ` · ${j.location}` : ""}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
              {STATUS.filter((s) => s !== j.status).map((s) => (
                <button key={s} onClick={() => setStatus(j.id, s)} style={{ fontSize: 11.5, fontWeight: 700, color: COLOR[s], background: "transparent", border: `1px solid ${COLOR[s]}55`, borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
                  {s === "active" ? L("Нийтлэх", "Publish") : label(s)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
