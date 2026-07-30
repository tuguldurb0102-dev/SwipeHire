/**
 * RecruitmentAnalyticsPanel — recruitment metrics (NOT billing/accounting).
 *
 * These values are mock/demo-derived in the parent and passed in. Every metric
 * is labelled "Demo data". Kept separate from subscription price, invoices and
 * plan usage so nothing here reads as an accounting record.
 */
import React from "react";

export default function RecruitmentAnalyticsPanel({
  lang = "mn", totalSpend = 0, hiredCount = 0, costPerHire = 0, avgSalary = 0, monthlyBars = [],
}) {
  const L = (mn, en) => (lang === "en" ? en : mn);

  const Card = ({ label, value, color }) => (
    <div style={{ flex: "1 1 140px", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim,#9a968d)", letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: color || "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>{value}</div>
    </div>
  );

  const max = Math.max(1, ...monthlyBars.map((b) => b.value || 0));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dim,#9a968d)", letterSpacing: ".5px" }}>{L("БҮРДҮҮЛЭЛТИЙН ШИНЖИЛГЭЭ", "RECRUITMENT ANALYTICS")}</div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#B488FF", background: "rgba(180,136,255,0.12)", border: "1px solid rgba(180,136,255,0.35)", borderRadius: 999, padding: "2px 8px" }}>{L("Демо өгөгдөл", "Demo data")}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <Card label={L("Нийт зарцуулалт", "Total spend")} value={`₮${totalSpend.toLocaleString()}`} color="#FF6B35" />
        <Card label={L("Ажилд авсан", "Hires")} value={hiredCount} color="#3DDC97" />
        <Card label={L("Нэг хүний өртөг", "Cost per hire")} value={costPerHire ? `₮${costPerHire.toLocaleString()}` : "—"} color="#4FA3FF" />
        <Card label={L("Дундаж цалин", "Avg salary")} value={avgSalary ? `₮${Math.round(avgSalary / 1000)}к` : "—"} color="#FFD23F" />
      </div>

      {monthlyBars.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dim,#9a968d)", marginBottom: 10 }}>{L("Сарын зарцуулалт (демо)", "Monthly spend (demo)")}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {monthlyBars.map((b, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: (b.value / max) * 72 || 4, borderRadius: 6, background: b.value ? "linear-gradient(180deg,#FF6B35,#c94f20)" : "rgba(255,255,255,0.06)", transition: "height .4s" }} />
                <span style={{ fontSize: 9.5, color: "var(--dim,#9a968d)", whiteSpace: "nowrap" }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
