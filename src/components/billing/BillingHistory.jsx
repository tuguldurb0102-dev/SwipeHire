/**
 * BillingHistory — development-only list of sandbox purchase records.
 * Presentational; no real accounting. Every row is labelled development data.
 */
import React from "react";
import { getSeekerService } from "../../billing/catalog.js";
import PaymentStatus from "./PaymentStatus.jsx";

const money = (n) => (n == null ? "—" : `₮${n.toLocaleString()}`);
const when = (ts) => (ts ? new Date(ts).toLocaleDateString() : "—");

export default function BillingHistory({ purchases = [], lang = "mn", onUseCredit }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const nameOf = (id) => {
    const s = getSeekerService(id);
    return s ? (s.name?.[lang] || s.name?.mn) : id;
  };

  if (purchases.length === 0) {
    return <div style={{ fontSize: 13, color: "#9a968d", padding: "12px 0" }}>{L("Түүх алга.", "No history yet.")}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {purchases.slice().reverse().map((p) => {
        const usable = p.status === "paid" && !p.usedAt;
        return (
          <div key={p.ref} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink,#f6f4ef)" }}>{nameOf(p.serviceId)}</div>
                <div style={{ fontSize: 11, color: "#9a968d", fontFamily: "monospace" }}>{p.ref}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink,#f6f4ef)" }}>{money(p.amount)}</div>
                <PaymentStatus record={p} lang={lang} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "#9a968d" }}>
                {L("Авсан", "Purchased")}: {when(p.purchasedAt)}{p.usedAt ? ` · ${L("Ашигласан", "Used")}: ${when(p.usedAt)}` : ""}
              </span>
              {usable && onUseCredit && (
                <button onClick={() => onUseCredit(p.ref)} style={{ fontSize: 12, fontWeight: 800, color: "#FF6B35", background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.4)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
                  {L("Эрх ашиглах", "Use Credit")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
