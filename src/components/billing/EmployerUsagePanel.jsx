/**
 * EmployerUsagePanel — plan allowances for the employer's current plan.
 *
 * Allowances come from the catalog. Actual usage counters DO NOT exist yet, so
 * every row shows "Usage: Not tracked yet" — never a fabricated used/remaining
 * count. Numeric = allowance, Infinity = Unlimited, booleans = Included / Not
 * included, and the API-access placeholder = Future integration.
 */
import React from "react";
import { getEmployerPlan } from "../../billing/catalog.js";

const NUMERIC_LABELS = {
  candidateViewsPerMonth: (L) => [L("Нэр дэвшигч үзэх", "Candidate views"), L("сард", "per month")],
  candidateContactsPerYear: (L) => [L("Холбоо барих", "Candidate contacts"), L("жилд", "per year")],
  candidateContacts: (L) => [L("Холбоо барих", "Candidate contacts"), ""],
  savedCandidates: (L) => [L("Хадгалсан нэр дэвшигч", "Saved candidates"), ""],
  activeJobPosts: (L) => [L("Идэвхтэй зар", "Active job posts"), ""],
  teamMembers: (L) => [L("Багийн гишүүд", "Team members"), ""],
};
const BOOL_LABELS = {
  basicAiMatching: (L) => L("AI тохироо (үндсэн)", "AI matching (basic)"),
  advancedAiSearch: (L) => L("Дэвшилтэт AI хайлт", "Advanced AI search"),
  candidateComparison: (L) => L("Нэр дэвшигч харьцуулах", "Candidate comparison"),
  analytics: (L) => L("Бүрдүүлэлтийн шинжилгээ", "Recruitment analytics"),
  prioritySupport: (L) => L("Тэргүүлэх дэмжлэг", "Priority support"),
};

export default function EmployerUsagePanel({ lang = "mn", planId = "free" }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const plan = getEmployerPlan(planId) || getEmployerPlan("free");
  const limits = plan.limits || {};

  const fmtNumeric = (v, unit) => {
    if (v === Infinity) return L("Хязгааргүй", "Unlimited");
    if (v === null) return L("Захиалгат", "Custom");
    return `${v.toLocaleString()}${unit ? " " + unit : ""}`;
  };

  const rows = [];
  for (const [k, v] of Object.entries(limits)) {
    if (NUMERIC_LABELS[k]) {
      const [label, unit] = NUMERIC_LABELS[k](L);
      rows.push({ label, allowance: fmtNumeric(v, unit) });
    } else if (BOOL_LABELS[k]) {
      rows.push({ label: BOOL_LABELS[k](L), allowance: v ? L("Багтсан", "Included") : L("Багтаагүй", "Not included") });
    } else if (k === "apiAccess") {
      rows.push({ label: L("API хандалт", "API access"), allowance: v === true ? L("Багтсан", "Included") : L("Ирээдүйн интеграци", "Future integration") });
    }
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dim,#9a968d)", letterSpacing: ".5px", marginBottom: 10 }}>{L("БАГЦЫН АШИГЛАЛТ", "PLAN USAGE")}</div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "4px 16px" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--ink,#f6f4ef)", fontWeight: 600 }}>{r.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FF6B35" }}>{r.allowance}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--dim,#9a968d)", marginTop: 2 }}>{L("Ашиглалт: бүртгэгдээгүй", "Usage: Not tracked yet")}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "#FFD23F", marginTop: 8 }}>
        {L("Ашиглалтын бүртгэлийн backend холбогдоогүй", "Usage tracking backend not connected")}
      </div>
    </div>
  );
}
