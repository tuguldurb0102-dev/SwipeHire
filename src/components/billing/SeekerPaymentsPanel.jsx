/**
 * SeekerPaymentsPanel — the PRIMARY job-seeker billing entry (pay-per-service).
 *
 * Holds sandbox purchase records in local component state with optional
 * DEVELOPMENT-ONLY localStorage persistence (non-sensitive data only). It is
 * not real accounting or a real payment record.
 *
 * Credit creation/consumption goes through the shared entitlement engine
 * (src/billing/entitlements.js). A purchase becomes an available credit only
 * when PaymentFlow reports a verified `paid` status. Using a credit only tests
 * entitlement consumption — no AI service is executed.
 */
import React, { useEffect, useState } from "react";
import { allServiceCredits, consumeCredit } from "../../billing/entitlements.js";
import JobSeekerServices from "./JobSeekerServices.jsx";
import BillingHistory from "./BillingHistory.jsx";
import PaymentStatus from "./PaymentStatus.jsx";

const LS_KEY = "dev:swipehire:seeker-billing"; // development-only, non-sensitive

function loadDev() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function SeekerPaymentsPanel({ lang = "mn" }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [purchases, setPurchases] = useState(loadDev);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(purchases)); } catch { /* dev only */ }
  }, [purchases]);

  // Create exactly one credit per verified paid entitlement (dedupe by ref).
  const addPurchase = (ent) => {
    setPurchases((prev) => {
      if (prev.some((p) => p.ref === ent.ref)) return prev;
      return [...prev, {
        kind: "seeker_service",
        serviceId: ent.itemId,
        ref: ent.ref,
        amount: ent.amount,
        status: "paid",
        purchasedAt: Date.now(),
        sandbox: true,
        receipt: { ref: ent.ref, amount: ent.amount, note: "DEMO receipt — not a real payment." },
      }];
    });
  };

  const useCredit = (ref) => {
    setPurchases((prev) => {
      const { purchases: next, ok } = consumeCredit(prev, ref);
      setNotice(ok
        ? L("Үйлчилгээ гүйцэтгэл холбогдоогүй; энэ үйлдэл зөвхөн эрх зарцуулалтыг шалгана.",
             "Service execution is not connected; this action only tests credit consumption.")
        : L("Энэ эрхийг ашиглах боломжгүй.", "This credit cannot be used."));
      return next;
    });
  };

  const credits = allServiceCredits(purchases).filter((c) => c.total > 0);
  const receipts = purchases.filter((p) => p.receipt);
  const refunds = purchases.filter((p) => p.status === "refunded" || p.status === "partially_refunded");

  const Section = ({ title, children }) => (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 12, color: "#9a968d", fontWeight: 700, letterSpacing: 0.4, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "16px 16px 40px" }}>
      {/* Header + dev-data label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>
          {L("AI үйлчилгээ", "AI Services")}
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#FFD23F", background: "rgba(255,210,63,0.12)", border: "1px solid rgba(255,210,63,0.35)", borderRadius: 999, padding: "4px 10px" }}>🧪 {L("Sandbox", "Sandbox")}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#4FA3FF", background: "rgba(79,163,255,0.12)", border: "1px solid rgba(79,163,255,0.35)", borderRadius: 999, padding: "4px 10px" }}>{L("Хөгжүүлэлтийн урьдчилсан", "Development Preview")}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#ff8a8a", background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,138,138,0.35)", borderRadius: 999, padding: "4px 10px" }}>{L("Бодит төлбөр биш", "Not a real payment")}</span>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: "#9a968d", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: "4px 10px" }}>{L("Зөвхөн хөгжүүлэлтийн локал өгөгдөл", "Development-only local data")}</span>
      </div>

      {notice && (
        <div style={{ fontSize: 12.5, color: "#4FA3FF", background: "rgba(79,163,255,0.08)", border: "1px solid rgba(79,163,255,0.3)", borderRadius: 10, padding: "10px 12px", marginTop: 10 }}>
          {notice}
        </div>
      )}

      {/* Available services + purchase */}
      <Section title={L("БОЛОМЖТОЙ ҮЙЛЧИЛГЭЭ", "AVAILABLE SERVICES")}>
        <JobSeekerServices purchases={purchases} lang={lang} onPurchased={addPurchase} />
      </Section>

      {/* Available credits */}
      <Section title={L("АШИГЛАХ БОЛОМЖТОЙ ЭРХ", "AVAILABLE CREDITS")}>
        {credits.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9a968d" }}>{L("Ашиглах эрх алга.", "No credits yet.")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {credits.map((c) => (
              <div key={c.serviceId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                <span style={{ color: "var(--ink,#f6f4ef)" }}>{c.serviceId}</span>
                <span style={{ color: "#9a968d" }}>
                  {L("Боломжтой", "Available")}: <b style={{ color: "#3DDC97" }}>{c.available}</b> · {L("Ашигласан", "Used")}: {c.used}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Purchased services / payment history (with Use Credit) */}
      <Section title={L("ХУДАЛДАН АВСАН ҮЙЛЧИЛГЭЭ · ТӨЛБӨРИЙН ТҮҮХ", "PURCHASED SERVICES · PAYMENT HISTORY")}>
        <BillingHistory purchases={purchases} lang={lang} onUseCredit={useCredit} />
      </Section>

      {/* Receipts */}
      <Section title={L("БАРИМТУУД", "RECEIPTS")}>
        {receipts.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9a968d" }}>{L("Баримт алга.", "No receipts yet.")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {receipts.map((p) => (
              <div key={p.ref} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                <span style={{ fontFamily: "monospace", color: "#9a968d" }}>{p.receipt.ref}</span>
                <span style={{ color: "#FFD23F", fontSize: 11 }}>{p.receipt.note}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Refund status */}
      <Section title={L("БУЦААЛТЫН ТӨЛӨВ", "REFUND STATUS")}>
        {refunds.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9a968d" }}>{L("Буцаалт алга.", "No refunds.")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {refunds.map((p) => (
              <div key={p.ref} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10 }}>
                <span style={{ fontFamily: "monospace", color: "#9a968d" }}>{p.ref}</span>
                <PaymentStatus record={p} lang={lang} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
