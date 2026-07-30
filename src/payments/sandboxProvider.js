/**
 * SandboxProvider — a DEVELOPMENT-ONLY, clearly-labeled demo payment backend.
 *
 * It exists so the payment FLOW and UI can be built and tested while no real
 * provider and no live Supabase backend are available. It is NOT a payment
 * processor and must never be presented as one.
 *
 * Deliberate design so it can never fake a real success:
 *  - createPayment returns a `pending` order. Nothing is unlocked.
 *  - The order stays pending until an EXPLICIT out-of-band action calls
 *    `resolve(ref, outcome)` — modelling the user completing (or failing)
 *    payment on the provider's side. There is no timer that auto-succeeds.
 *  - verifyPayment returns whatever the (explicitly-set) status actually is.
 *  - `connected` is false, and `isSandbox` is true, so the UI always shows a
 *    "Demo / Sandbox — not a real payment" badge.
 *
 * State is in-memory only (no localStorage of financial records).
 */
import { PaymentProvider } from "./PaymentProvider.js";
import { PAYMENT_STATUS, catalogPrice } from "../billing/catalog.js";

export class SandboxProvider extends PaymentProvider {
  constructor() {
    super({ id: "sandbox", label: "Demo / Sandbox", connected: false });
    this.isSandbox = true;
    this._orders = new Map(); // ref -> order
    this._seen = new Set();   // idempotency keys already used
  }

  /**
   * @param order {{ kind, itemId, idempotencyKey, clientPrice? }}
   * Note: clientPrice is accepted but IGNORED for the charge — the amount is
   * resolved from the catalog, mirroring the server-side price-validation rule.
   */
  async createPayment(order) {
    if (!order?.idempotencyKey) throw new Error("idempotencyKey required");

    // Idempotency: same key returns the same order, never a second charge.
    if (this._seen.has(order.idempotencyKey)) {
      const existing = [...this._orders.values()].find(
        (o) => o.idempotencyKey === order.idempotencyKey
      );
      if (existing) return { ...existing };
    }

    const amount = catalogPrice(order.kind, order.itemId);
    if (amount == null) throw new Error(`unknown catalog item: ${order.kind}/${order.itemId}`);

    const ref = `sbx_${Math.random().toString(36).slice(2, 10)}`;
    const record = {
      ref,
      kind: order.kind,
      itemId: order.itemId,
      amount,                       // authoritative, from catalog
      status: PAYMENT_STATUS.PENDING,
      idempotencyKey: order.idempotencyKey,
      createdAt: Date.now(),
      isSandbox: true,
    };
    this._orders.set(ref, record);
    this._seen.add(order.idempotencyKey);
    return { ...record };
  }

  async checkPaymentStatus(ref) {
    const o = this._orders.get(ref);
    if (!o) throw new Error(`unknown ref: ${ref}`);
    return { ref, status: o.status, amount: o.amount, isSandbox: true };
  }

  /** Verification returns the real current status — no unconditional success. */
  async verifyPayment(ref) {
    return this.checkPaymentStatus(ref);
  }

  async cancelPayment(ref) {
    const o = this._orders.get(ref);
    if (!o) throw new Error(`unknown ref: ${ref}`);
    if (o.status === PAYMENT_STATUS.PENDING) o.status = PAYMENT_STATUS.CANCELLED;
    return { ref, status: o.status, isSandbox: true };
  }

  async refundPayment(ref, amount) {
    const o = this._orders.get(ref);
    if (!o) throw new Error(`unknown ref: ${ref}`);
    if (o.status !== PAYMENT_STATUS.PAID) throw new Error("only paid orders can be refunded");
    o.status = amount && amount < o.amount
      ? PAYMENT_STATUS.PARTIALLY_REFUNDED
      : PAYMENT_STATUS.REFUNDED;
    return { ref, status: o.status, isSandbox: true };
  }

  async getReceipt(ref) {
    const o = this._orders.get(ref);
    if (!o) throw new Error(`unknown ref: ${ref}`);
    return {
      ref,
      amount: o.amount,
      status: o.status,
      issuedAt: o.createdAt,
      isSandbox: true,
      note: "DEMO receipt — not a real payment.",
    };
  }

  /**
   * DEV-ONLY hook, not part of the PaymentProvider interface. The demo UI calls
   * this to model the user finishing payment on the provider side. A real
   * provider would receive this via webhook/redirect; here it is explicit so no
   * success ever happens automatically.
   */
  resolve(ref, outcome = "success") {
    const o = this._orders.get(ref);
    if (!o) throw new Error(`unknown ref: ${ref}`);
    if (o.status !== PAYMENT_STATUS.PENDING && o.status !== PAYMENT_STATUS.PROCESSING) {
      throw new Error(`order ${ref} is already terminal (${o.status})`);
    }
    o.status = outcome === "success" ? PAYMENT_STATUS.PAID
      : outcome === "processing" ? PAYMENT_STATUS.PROCESSING
      : outcome === "expired" ? PAYMENT_STATUS.EXPIRED
      : PAYMENT_STATUS.FAILED;
    return { ref, status: o.status, isSandbox: true };
  }
}
