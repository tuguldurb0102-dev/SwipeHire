/**
 * EmployerPlanSheet — the employer-facing annual-plan paywall.
 *
 * Separate from the legacy shared PaywallSheet (which now serves only the
 * legacy Job Seeker PRO flow). All plan names, prices, limits and features come
 * from src/billing/catalog.js — nothing is duplicated in this JSX.
 *
 * Checkout is delegated to the SINGLE existing PaymentFlow (sandbox only). A
 * verified sandbox `paid` result updates ONLY a development-scenario plan
 * selection passed back via onDevPlanChange — it never touches empSubscribed,
 * real feature access, Supabase, or production permissions.
 */
import React, { useState } from "react";
import { EMPLOYER_PLANS, getEmployerPlan } from "../../billing/catalog.js";
import PaymentFlow from "./PaymentFlow.jsx";

const money = (n) => (n === 0 ? "0₮" : n == null ? null : `₮${n.toLocaleString()}`);

/** Format a raw limit value for display (no used/remaining — untracked). */
function fmtLimit(v, L) {
  if (v === Infinity) return L("Хязгааргүй", "Unlimited");
  if (v === null) return L("Захиалгат", "Custom");
  if (v === true) return "✓";
  if (v === false) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

const LIMIT_LABELS = {
  candidateViewsPerMonth: (L) => L("Сард нэр дэвшигч үзэх", "Candidate views / month"),
  candidateContactsPerYear: (L) => L("Жилд холбоо барих", "Candidate contacts / year"),
  candidateContacts: (L) => L("Холбоо барих", "Candidate contacts"),
  savedCandidates: (L) => L("Хадгалсан нэр дэвшигч", "Saved candidates"),
  activeJobPosts: (L) => L("Идэвхтэй зар", "Active job posts"),
  teamMembers: (L) => L("Багийн гишүүд", "Team members"),
};

export default function EmployerPlanSheet({
  lang = "mn",
  currentPlanId = "free",
  onDevPlanChange,
  onClose,
}) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [checkoutId, setCheckoutId] = useState(null);

  const current = getEmployerPlan(currentPlanId) || getEmployerPlan("free");
  const nameOf = (p) => p.name?.[lang] || p.name?.mn || p.name;

  const S = {
    overlay: { position: "fixed", inset: 0, zIndex: 240, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column" },
    sheet: { background: "#141310", flex: 1, overflowY: "auto", padding: "0 18px 40px" },
    badge: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: "#FFD23F", background: "rgba(255,210,63,0.12)", border: "1px solid rgba(255,210,63,0.35)", borderRadius: 999, padding: "4px 10px" },
    label: { fontSize: 12, color: "#9a968d", fontWeight: 700, letterSpacing: 0.4, margin: "22px 0 8px" },
  };

  return (
    <div style={S.overlay} role="dialog" aria-modal="true">
      <div style={S.sheet}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 4px" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>
            {L("Багц сонгох", "Choose Plan")}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, color: "#9a968d", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {/* Dev / sandbox labels */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0 4px" }}>
          <span style={S.badge}>🧪 {L("Sandbox", "Sandbox")}</span>
          <span style={{ ...S.badge, color: "#4FA3FF", background: "rgba(79,163,255,0.12)", borderColor: "rgba(79,163,255,0.35)" }}>{L("Хөгжүүлэлтийн урьдчилсан", "Development Preview")}</span>
          <span style={{ ...S.badge, color: "#ff8a8a", background: "rgba(255,107,53,0.12)", borderColor: "rgba(255,138,138,0.35)" }}>{L("Бодит төлбөр биш", "Not a real payment")}</span>
        </div>

        {/* Current plan (development scenario) */}
        <div style={S.label}>{L("ОДООГИЙН БАГЦ", "CURRENT PLAN")}</div>
        <div style={{ background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.3)", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "var(--ink,#f6f4ef)" }}>{nameOf(current)}</div>
              <div style={{ fontSize: 12, color: "#9a968d", marginTop: 2 }}>
                {L("Төлөв", "Status")}: {L("Хөгжүүлэлтийн хувилбар", "Development scenario")}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#9a968d" }}>{L("Жилийн үнэ", "Annual Price")}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#FF6B35" }}>{current.custom ? L("Захиалгат", "Custom") : money(current.annual)}</div>
            </div>
          </div>
        </div>

        {/* Plan comparison */}
        <div style={S.label}>{L("БАГЦУУД", "PLANS")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {EMPLOYER_PLANS.map((p) => {
            const isCurrent = p.id === current.id;
            const recommended = !!p.popular;
            return (
              <div key={p.id} style={{
                background: recommended ? "rgba(255,210,63,0.06)" : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${recommended ? "rgba(255,210,63,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 16, padding: "16px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 17, fontWeight: 900, color: "var(--ink,#f6f4ef)" }}>{nameOf(p)}</span>
                      {recommended && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#FFD23F", background: "rgba(255,210,63,0.15)", border: "1px solid rgba(255,210,63,0.4)", borderRadius: 999, padding: "2px 8px" }}>{L("Санал болгож буй", "Recommended")}</span>}
                      {isCurrent && <span style={{ fontSize: 9.5, fontWeight: 800, color: "#3DDC97", background: "rgba(61,220,151,0.12)", border: "1px solid rgba(61,220,151,0.4)", borderRadius: 999, padding: "2px 8px" }}>{L("Одоогийн", "Current")}</span>}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#FF6B35", marginTop: 4 }}>
                      {p.custom ? L("Захиалгат үнэ", "Custom pricing") : `${money(p.annual)}${p.annual ? L(" / жил", " / year") : ""}`}
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div style={{ margin: "12px 0 4px", fontSize: 11, color: "#9a968d", fontWeight: 700 }}>{L("Багцын боломжууд", "Plan Features")}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ fontSize: 13, color: "#d6d2c9", display: "flex", gap: 8 }}>
                      <span style={{ color: "#3DDC97" }}>✓</span>{f[lang] || f.mn}
                    </li>
                  ))}
                </ul>

                {/* Allowances (untracked) */}
                {Object.keys(p.limits || {}).some((k) => LIMIT_LABELS[k]) && (
                  <>
                    <div style={{ margin: "12px 0 4px", fontSize: 11, color: "#9a968d", fontWeight: 700 }}>{L("Багцын лимит", "Plan Allowance")}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {Object.entries(p.limits).filter(([k]) => LIMIT_LABELS[k]).map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                          <span style={{ color: "#9a968d" }}>{LIMIT_LABELS[k](L)}</span>
                          <span style={{ color: "var(--ink,#f6f4ef)", fontWeight: 700 }}>{fmtLimit(v, L)}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "#FFD23F", marginTop: 6 }}>
                      {L("Багцын лимит — ашиглалтын бүртгэл холбогдоогүй", "Plan allowance — usage tracking not yet connected")}
                    </div>
                  </>
                )}

                {/* Action */}
                <div style={{ marginTop: 14 }}>
                  {p.custom ? (
                    <button onClick={() => window.alert(L("Борлуулалтын багтай холбогдоно уу.", "Please contact our sales team."))}
                      style={{ width: "100%", padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "var(--ink,#f6f4ef)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                      {L("Борлуулалтын багтай холбогдох", "Contact Sales")}
                    </button>
                  ) : isCurrent ? (
                    <button onClick={() => setCheckoutId(p.id)}
                      style={{ width: "100%", padding: "11px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "var(--ink,#f6f4ef)", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                      {L("Сунгах", "Renew")}
                    </button>
                  ) : (
                    <button onClick={() => setCheckoutId(p.id)}
                      style={{ width: "100%", padding: "11px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                      {p.tier > current.tier ? L("Багц ахиулах", "Upgrade") : L("Багц сонгох", "Choose Plan")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Single checkout — the existing PaymentFlow. Verified sandbox paid
          updates only the development-scenario plan via onDevPlanChange. */}
      {checkoutId && (
        <PaymentFlow
          kind="employer_plan"
          itemId={checkoutId}
          lang={lang}
          onEntitlement={(ent) => {
            if (ent?.status === "paid") onDevPlanChange?.(ent.itemId); // dev scenario only
          }}
          onClose={() => setCheckoutId(null)}
        />
      )}
    </div>
  );
}
