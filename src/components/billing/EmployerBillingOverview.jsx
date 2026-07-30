/**
 * EmployerBillingOverview — the logged-in employer's OWN subscription summary.
 *
 * Shows only this company's plan/billing. No SwipeHire company-wide finance
 * (no MRR/ARR/revenue/expenses/burn/runway). Plan name & price come from the
 * catalog; the plan id is the employer development-scenario state. Fields with
 * no backend show "Not connected"/"Not available" — never invented dates.
 *
 * Upgrade/Renew call the provided handler (which opens the existing
 * EmployerPlanSheet). Cancel shows a dev message and changes no real access.
 */
import React from "react";
import { getEmployerPlan } from "../../billing/catalog.js";

const money = (n) => (n === 0 ? "0₮" : n == null ? null : `₮${n.toLocaleString()}`);

export default function EmployerBillingOverview({ lang = "mn", planId = "free", onUpgrade, onRenew }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const plan = getEmployerPlan(planId) || getEmployerPlan("free");
  const nameOf = (p) => p.name?.[lang] || p.name?.mn || p.name;

  const NA = L("Холбогдоогүй", "Not connected");
  const NAV = L("Байхгүй", "Not available");

  const Row = ({ label, value, color }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontSize: 12.5, color: "var(--dim,#9a968d)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || "var(--ink,#f6f4ef)" }}>{value}</span>
    </div>
  );

  const cancel = () => window.alert(L(
    "Production захиалга цуцлах холбогдоогүй.",
    "Production subscription cancellation is not connected."));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dim,#9a968d)", letterSpacing: ".5px" }}>{L("ЗАХИАЛГА", "SUBSCRIPTION")}</div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#FFD23F", background: "rgba(255,210,63,0.12)", border: "1px solid rgba(255,210,63,0.35)", borderRadius: 999, padding: "3px 9px" }}>{L("Хөгжүүлэлтийн хувилбар", "Development scenario")}</span>
      </div>

      <div style={{ background: "rgba(255,107,53,0.07)", border: "1px solid rgba(255,107,53,0.25)", borderRadius: 14, padding: "4px 16px" }}>
        <Row label={L("Одоогийн багц", "Current Plan")} value={nameOf(plan)} color="#FF6B35" />
        <Row label={L("Захиалгын төлөв", "Subscription status")} value={L("Хөгжүүлэлтийн хувилбар", "Development scenario")} />
        <Row label={L("Жилийн үнэ", "Annual Price")} value={plan.custom ? L("Захиалгат", "Custom") : money(plan.annual)} />
        <Row label={L("Төлбөрийн мөчлөг", "Billing Cycle")} value={plan.annual ? L("Жилийн", "Annual") : "—"} />
        <Row label={L("Эхлэх огноо", "Plan start date")} value={NAV} />
        <Row label={L("Сунгалтын огноо", "Renewal Date")} value={NAV} />
        <Row label={L("Үлдсэн хоног", "Remaining days")} value={NAV} />
        <Row label={L("Автоматаар сунгах", "Auto Renewal")} value={NA} />
        <Row label={L("Төлбөрийн хэрэгсэл", "Payment Method")} value={NA} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={onUpgrade} style={{ flex: "1 1 120px", padding: "10px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{L("Багц ахиулах", "Upgrade")}</button>
        <button onClick={onRenew} style={{ flex: "1 1 120px", padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "var(--ink,#f6f4ef)", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{L("Сунгах", "Renew")}</button>
        <button onClick={cancel} style={{ flex: "1 1 120px", padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--dim,#9a968d)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{L("Цуцлах", "Cancel")}</button>
        <button onClick={() => window.alert(L("Дэмжлэгтэй холбогдоно уу.", "Please contact support."))} style={{ flex: "1 1 120px", padding: "10px", borderRadius: 11, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--dim,#9a968d)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{L("Дэмжлэг", "Contact support")}</button>
      </div>
    </div>
  );
}
