/**
 * PaymentStatus — a small, presentational status chip for seeker purchases.
 * Maps a raw payment status (+ usedAt) to the display bucket via the shared
 * entitlement engine, so status meaning is never re-derived in UI.
 */
import React from "react";
import { purchaseDisplayState } from "../../billing/entitlements.js";

const STYLES = {
  available:  { c: "#3DDC97", mn: "Боломжтой",       en: "Available" },
  used:       { c: "#9a968d", mn: "Ашигласан",       en: "Used" },
  processing: { c: "#FFD23F", mn: "Боловсруулж байна", en: "Processing" },
  failed:     { c: "#ff8a8a", mn: "Амжилтгүй",       en: "Failed" },
  cancelled:  { c: "#ff8a8a", mn: "Цуцлагдсан",      en: "Cancelled" },
  expired:    { c: "#c9a24f", mn: "Хугацаа дууссан", en: "Expired" },
  refunded:   { c: "#4FA3FF", mn: "Буцаан олгосон",  en: "Refunded" },
  unknown:    { c: "#9a968d", mn: "Тодорхойгүй",     en: "Unknown" },
};

export default function PaymentStatus({ record, status, lang = "mn" }) {
  // Prefer a full record (uses usedAt); fall back to a bare status.
  const bucket = record ? purchaseDisplayState(record)
    : status === "cancelled" ? "cancelled"
    : purchaseDisplayState({ status });
  const s = STYLES[bucket] || STYLES.unknown;
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, color: s.c,
      background: `${s.c}1f`, border: `1px solid ${s.c}55`, borderRadius: 999,
      padding: "2px 9px", whiteSpace: "nowrap",
    }}>
      {lang === "en" ? s.en : s.mn}
    </span>
  );
}
