/**
 * JobSeekerServices — the pay-per-service catalog grid for job seekers.
 *
 * Services come only from src/billing/catalog.js. Selecting a service opens the
 * existing PaymentFlow (kind="job_seeker_service"); a verified sandbox paid
 * result is reported via onPurchased so the panel can create one credit.
 * No AI feature is executed here — entitlement preview only.
 */
import React, { useState } from "react";
import { SEEKER_SERVICES } from "../../billing/catalog.js";
import { serviceCredits } from "../../billing/entitlements.js";
import PaymentFlow from "./PaymentFlow.jsx";

const money = (n) => `₮${n.toLocaleString()}`;

// Short bilingual descriptions (UI copy — not catalog pricing data).
const DESC = {
  cv_rewrite:     { mn: "CV-г AI-аар мэргэжлийн түвшинд сайжруулна.", en: "AI polishes your CV to a professional level." },
  cover_letter:   { mn: "Ажлын байранд тохирсон гэмжих захидал.", en: "A cover letter tailored to the job." },
  interview_prep: { mn: "Ярилцлагад бэлдэх дасгал, зөвлөгөө.", en: "Practice and tips to prepare for interviews." },
  premium_cv:     { mn: "Онцлох Premium CV загвар.", en: "A standout Premium CV template." },
  career_ai:      { mn: "Карьерын хувийн AI зөвлөгөө.", en: "Personalised AI career advice." },
};

export default function JobSeekerServices({ purchases = [], lang = "mn", onPurchased }) {
  const L = (mn, en) => (lang === "en" ? en : mn);
  const [checkoutId, setCheckoutId] = useState(null);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: "#FFD23F", background: "rgba(255,210,63,0.08)", border: "1px solid rgba(255,210,63,0.3)", borderRadius: 10, padding: "10px 12px", marginBottom: 12, lineHeight: 1.45 }}>
        {L("Төлбөрийн эрхийн урьдчилсан харагдац — үйлчилгээ гүйцэтгэл холбогдоогүй.",
           "Payment entitlement preview only — service execution is not connected.")}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SEEKER_SERVICES.map((svc) => {
          const credit = serviceCredits(purchases, svc.id);
          return (
            <div key={svc.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink,#f6f4ef)" }}>{svc.name?.[lang] || svc.name?.mn}</div>
                  <div style={{ fontSize: 12.5, color: "#9a968d", marginTop: 3, lineHeight: 1.4 }}>{DESC[svc.id]?.[lang] || DESC[svc.id]?.mn}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#FF6B35", whiteSpace: "nowrap" }}>{money(svc.price)}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 12, color: credit.available > 0 ? "#3DDC97" : "#9a968d" }}>
                  {L("Ашиглах эрх", "Available credits")}: <b>{credit.available}</b>
                </span>
                <button onClick={() => setCheckoutId(svc.id)} style={{ fontSize: 13, fontWeight: 800, color: "#fff", background: "linear-gradient(135deg,#FF6B35,#E85400)", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer" }}>
                  {L("Худалдан авах", "Purchase")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {checkoutId && (
        <PaymentFlow
          kind="job_seeker_service"
          itemId={checkoutId}
          lang={lang}
          onEntitlement={(ent) => {
            if (ent?.status === "paid") onPurchased?.(ent); // verified paid only
          }}
          onClose={() => setCheckoutId(null)}
        />
      )}
    </div>
  );
}
