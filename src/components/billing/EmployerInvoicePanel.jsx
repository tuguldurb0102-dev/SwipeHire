/**
 * EmployerInvoicePanel — payments & invoices for the employer.
 *
 * No production payment backend is connected, so the primary state is honest
 * empty states. The former hardcoded INVOICES demo rows are intentionally NOT
 * shown here (they were mock data presented as real history). No fake
 * downloadable production invoices are generated.
 */
import React from "react";

export default function EmployerInvoicePanel({ lang = "mn" }) {
  const L = (mn, en) => (lang === "en" ? en : mn);

  const Empty = ({ children }) => (
    <div style={{ fontSize: 12.5, color: "var(--dim,#9a968d)", padding: "10px 0" }}>{children}</div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dim,#9a968d)", letterSpacing: ".5px", marginBottom: 10 }}>{L("ТӨЛБӨР БА НЭХЭМЖЛЭХ", "PAYMENTS AND INVOICES")}</div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink,#f6f4ef)" }}>{L("Баталгаажсан төлбөр", "Verified Payments")}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#9a968d", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, padding: "2px 8px" }}>{L("Backend шаардлагатай", "Backend required")}</span>
        </div>
        <Empty>{L("Баталгаажсан төлбөр одоогоор алга.", "No verified payments yet.")}</Empty>
        <Empty>{L("Production нэхэмжлэхийн үйлчилгээ холбогдоогүй.", "Production invoice service is not connected.")}</Empty>
        <Empty>{L("Баталгаажсан төлбөрийн интеграцийн дараа баримт харагдана.", "Receipts will appear after verified payment integration.")}</Empty>
      </div>
    </div>
  );
}
