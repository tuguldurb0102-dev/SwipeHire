/**
 * PaymentFlow — a self-contained, reusable checkout flow.
 *
 * Deliberately decoupled from SwipeHire.jsx: it takes plain props (no shared
 * context), so it can be reused for employer plans and seeker services alike.
 *
 * Safety guarantees (verified by tests in src/payments):
 *  - Uses the sandbox provider only. Every screen is labelled Sandbox /
 *    Development Preview / Not a real payment.
 *  - A new order starts `pending`. Nothing is unlocked on "Pay".
 *  - Entitlement is produced ONLY after an explicit dev simulation flips the
 *    sandbox status AND a subsequent verifyPayment returns `paid`. Failure,
 *    cancellation, pending, processing, refunded and expired never grant access.
 *  - Idempotency + a `busy` guard prevent duplicate orders/charges.
 */
import React, { useState, useRef, useCallback } from "react";
import { activeProvider, listProviders } from "../../payments/index.js";
import { catalogPrice, getEmployerPlan, getSeekerService, normalizeKind, PAYMENT_STATUS } from "../../billing/catalog.js";

const money = (n) => (n == null ? "—" : `₮${n.toLocaleString()}`);

const GRANTS = PAYMENT_STATUS.PAID;

export default function PaymentFlow({
  kind: rawKind,
  itemId,
  lang = "mn",
  provider = activeProvider,
  onClose,
  onEntitlement,
}) {
  const L = (mn, en) => (lang === "en" ? en : mn);

  // Accept "job_seeker_service" alias; use the canonical kind everywhere.
  const kind = normalizeKind(rawKind);
  const item = kind === "employer_plan" ? getEmployerPlan(itemId) : getSeekerService(itemId);
  const price = catalogPrice(kind, itemId);
  const itemName = item ? (item.name?.[lang] || item.name?.mn || item.name) : itemId;

  const [step, setStep] = useState("review"); // review | processing | result
  const [terms, setTerms] = useState(false);
  const [method, setMethod] = useState("sandbox");
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [entitled, setEntitled] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Idempotency key generated once per mounted flow.
  const idemKey = useRef(`idem_${Math.random().toString(36).slice(2)}_${Date.now()}`);

  const methods = listProviders();

  const startPayment = useCallback(async () => {
    if (busy || order) return; // guard: no duplicate order creation
    setBusy(true);
    setError(null);
    try {
      const o = await provider.createPayment({
        kind,
        itemId,
        idempotencyKey: idemKey.current,
      });
      setOrder(o);
      setStatus(o.status); // pending — nothing unlocked
      setStep("processing");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [busy, order, provider, kind, itemId]);

  /**
   * Dev-only: flip the sandbox status, THEN verify. Entitlement is granted only
   * if verification independently confirms `paid`.
   */
  const simulate = useCallback(async (outcome) => {
    if (!order || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (outcome === "cancel") {
        await provider.cancelPayment(order.ref);
      } else if (typeof provider.resolve === "function") {
        provider.resolve(order.ref, outcome); // 'success' | 'fail'
      }
      // Verification is the sole source of truth.
      const v = await provider.verifyPayment(order.ref);
      setStatus(v.status);
      const granted = v.status === GRANTS;
      setEntitled(granted);
      if (granted) {
        const r = await provider.getReceipt(order.ref);
        setReceipt(r);
        onEntitlement?.({
          kind,
          itemId,
          ref: order.ref,
          status: v.status,
          amount: order.amount,
          sandbox: true,
        });
      }
      setStep("result");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [order, busy, provider, kind, itemId, onEntitlement]);

  const S = {
    overlay: {
      position: "fixed", inset: 0, zIndex: 260, background: "rgba(0,0,0,0.82)",
      backdropFilter: "blur(10px)", display: "flex", flexDirection: "column",
    },
    sheet: { background: "#141310", flex: 1, overflowY: "auto", padding: "0 18px 40px" },
    badge: {
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800,
      letterSpacing: 0.4, color: "#FFD23F", background: "rgba(255,210,63,0.12)",
      border: "1px solid rgba(255,210,63,0.35)", borderRadius: 999, padding: "4px 10px",
    },
    row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" },
    btn: (bg) => ({
      padding: "13px 18px", borderRadius: 14, border: "none", background: bg,
      color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%",
      opacity: busy ? 0.6 : 1,
    }),
    ghost: {
      padding: "11px 16px", borderRadius: 12, background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)", color: "var(--ink,#f6f4ef)",
      fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%",
    },
    label: { fontSize: 12, color: "#9a968d", fontWeight: 700, letterSpacing: 0.4, margin: "20px 0 8px" },
  };

  const DevBadges = () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "16px 0 4px" }}>
      <span style={S.badge}>🧪 {L("Sandbox", "Sandbox")}</span>
      <span style={{ ...S.badge, color: "#4FA3FF", background: "rgba(79,163,255,0.12)", borderColor: "rgba(79,163,255,0.35)" }}>
        {L("Хөгжүүлэлтийн урьдчилсан", "Development Preview")}
      </span>
      <span style={{ ...S.badge, color: "#ff8a8a", background: "rgba(255,107,53,0.12)", borderColor: "rgba(255,138,138,0.35)" }}>
        {L("Бодит төлбөр биш", "Not a real payment")}
      </span>
    </div>
  );

  const Header = ({ title }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 4px" }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: "var(--ink,#f6f4ef)", fontFamily: "'Barlow Condensed',sans-serif" }}>{title}</div>
      <button onClick={onClose} aria-label="Close" style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, color: "#9a968d", cursor: "pointer", fontSize: 18 }}>✕</button>
    </div>
  );

  return (
    <div style={S.overlay} role="dialog" aria-modal="true">
      <div style={S.sheet}>

        {/* ── REVIEW ── */}
        {step === "review" && (
          <>
            <Header title={L("Захиалга", "Order")} />
            <DevBadges />

            <div style={S.label}>{L("ЗАХИАЛГА", "ORDER")}</div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "4px 16px" }}>
              <div style={S.row}>
                <span style={{ color: "var(--ink,#f6f4ef)", fontWeight: 700 }}>{itemName}</span>
                <span style={{ color: "#FF6B35", fontWeight: 900 }}>{money(price)}</span>
              </div>
              <div style={{ ...S.row, borderBottom: "none" }}>
                <span style={{ color: "#9a968d" }}>{L("Нийт", "Total")}</span>
                <span style={{ color: "var(--ink,#f6f4ef)", fontWeight: 900, fontSize: 18 }}>{money(price)}</span>
              </div>
            </div>

            <div style={S.label}>{L("ТӨЛБӨРИЙН АРГА", "PAYMENT METHOD")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {methods.map((m) => {
                const selectable = m.isSandbox; // only sandbox usable
                const active = method === m.id;
                return (
                  <div key={m.id} onClick={() => selectable && setMethod(m.id)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 14px", borderRadius: 12,
                      border: `1.5px solid ${active ? "#FF6B35" : "rgba(255,255,255,0.1)"}`,
                      background: active ? "rgba(255,107,53,0.08)" : "rgba(255,255,255,0.03)",
                      cursor: selectable ? "pointer" : "not-allowed", opacity: selectable ? 1 : 0.5,
                    }}>
                    <span style={{ color: "var(--ink,#f6f4ef)", fontWeight: 700 }}>{m.label}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: m.isSandbox ? "#FFD23F" : "#9a968d", border: `1px solid ${m.isSandbox ? "rgba(255,210,63,0.4)" : "rgba(255,255,255,0.15)"}`, borderRadius: 999, padding: "2px 8px" }}>
                      {m.isSandbox ? L("САНДБОКС", "SANDBOX") : L("ИРЭЭДҮЙД", "FUTURE")}
                    </span>
                  </div>
                );
              })}
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, margin: "20px 0 8px", cursor: "pointer" }}>
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3 }} />
              <span style={{ fontSize: 13, color: "#d6d2c9", lineHeight: 1.5 }}>
                {L("Үйлчилгээний нөхцөл ба Нууцлалын бодлогыг зөвшөөрч байна.", "I accept the Terms of Service and Privacy Policy.")}
              </span>
            </label>

            {error && <div style={{ color: "#ff8a8a", fontSize: 13, margin: "8px 0" }}>{error}</div>}

            <div style={{ marginTop: 16 }}>
              <button disabled={!terms || busy || !!order} onClick={startPayment}
                style={{ ...S.btn("linear-gradient(135deg,#FF6B35,#E85400)"), opacity: (!terms || busy) ? 0.5 : 1, cursor: (!terms || busy) ? "not-allowed" : "pointer" }}>
                {busy ? L("Түр хүлээнэ үү…", "Please wait…") : L("Төлбөр эхлүүлэх", "Start payment")}
              </button>
            </div>
          </>
        )}

        {/* ── PROCESSING / PENDING ── */}
        {step === "processing" && (
          <>
            <Header title={L("Төлбөр хүлээгдэж байна", "Payment pending")} />
            <DevBadges />
            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <div style={{ fontSize: 40 }}>⏳</div>
              <div style={{ fontSize: 15, color: "#9a968d", marginTop: 8 }}>
                {L("Статус: ", "Status: ")}<b style={{ color: "#FFD23F" }}>{status}</b>
              </div>
              <div style={{ fontSize: 12.5, color: "#9a968d", marginTop: 6 }}>
                {L("Энэ төлөвт ямар ч эрх нээгдэхгүй.", "Nothing is unlocked in this state.")}
              </div>
            </div>

            <div style={S.label}>{L("ХӨГЖҮҮЛЭЛТИЙН ХЯНАЛТ (САНДБОКС)", "DEVELOPMENT CONTROLS (SANDBOX)")}</div>
            {error && <div style={{ color: "#ff8a8a", fontSize: 13, margin: "0 0 8px" }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button disabled={busy} onClick={() => simulate("success")} style={S.btn("linear-gradient(135deg,#3DDC97,#2bc47f)")}>
                {L("Амжилттайг симуляц хийх", "Simulate success")}
              </button>
              <button disabled={busy} onClick={() => simulate("fail")} style={{ ...S.ghost, opacity: busy ? 0.6 : 1 }}>
                {L("Амжилтгүйг симуляц хийх", "Simulate failure")}
              </button>
              <button disabled={busy} onClick={() => simulate("cancel")} style={{ ...S.ghost, opacity: busy ? 0.6 : 1 }}>
                {L("Цуцлалтыг симуляц хийх", "Simulate cancellation")}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: "#6f6b63", marginTop: 12, lineHeight: 1.5 }}>
              {L("Симуляц нь эхлээд сандбокс статусыг өөрчилж, дараа нь баталгаажуулалт ажиллана. Зөвхөн баталгаажсан paid л эрх олгоно.",
                 "A simulation first updates the sandbox status, then verification runs. Only a verified paid result grants entitlement.")}
            </div>
          </>
        )}

        {/* ── RESULT ── */}
        {step === "result" && (
          <>
            <Header title={entitled ? L("Амжилттай", "Success") : L("Дүн", "Result")} />
            <DevBadges />
            <div style={{ textAlign: "center", padding: "20px 0 4px" }}>
              <div style={{ fontSize: 48 }}>{entitled ? "🎉" : status === PAYMENT_STATUS.CANCELLED ? "🚫" : "⚠️"}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: entitled ? "#3DDC97" : "#ff8a8a", marginTop: 6 }}>
                {L("Статус: ", "Status: ")}{status}
              </div>
              <div style={{ fontSize: 13, color: "#9a968d", marginTop: 8 }}>
                {entitled
                  ? L("Сандбокс эрх олгогдлоо (жинхэнэ төлбөр биш).", "Sandbox entitlement granted (not a real payment).")
                  : L("Эрх олгогдоогүй.", "No entitlement granted.")}
              </div>
            </div>

            {entitled && receipt && (
              <>
                <div style={S.label}>{L("БАРИМТ (ЖИШЭЭ)", "RECEIPT (DEMO)")}</div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "4px 16px" }}>
                  <div style={S.row}><span style={{ color: "#9a968d" }}>{L("Дугаар", "Ref")}</span><span style={{ color: "var(--ink,#f6f4ef)", fontFamily: "monospace" }}>{receipt.ref}</span></div>
                  <div style={S.row}><span style={{ color: "#9a968d" }}>{L("Дүн", "Amount")}</span><span style={{ color: "var(--ink,#f6f4ef)", fontWeight: 800 }}>{money(receipt.amount)}</span></div>
                  <div style={{ ...S.row, borderBottom: "none" }}><span style={{ color: "#9a968d" }}>{L("Тэмдэглэл", "Note")}</span><span style={{ color: "#FFD23F", fontSize: 12 }}>{receipt.note}</span></div>
                </div>
              </>
            )}

            <div style={{ marginTop: 20 }}>
              <button onClick={onClose} style={S.btn("linear-gradient(135deg,#FF6B35,#E85400)")}>
                {L("Хаах", "Close")}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
