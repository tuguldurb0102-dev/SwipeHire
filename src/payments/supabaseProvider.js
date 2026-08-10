/**
 * SupabaseProvider — a PaymentProvider that talks to the real backend
 * (Edge Functions + SECURITY DEFINER RPCs) instead of the in-memory sandbox.
 *
 * It is NOT the default. `activeProvider` stays on the sandbox until an
 * explicit flag (VITE_BILLING_BACKEND=supabase) selects this one, so the
 * existing UI and 129 tests are unaffected. This lets Step 7B wire and verify
 * the live path behind a flag before any switchover.
 *
 * Trust boundary: this client sends only a product CODE + company context +
 * idempotency key. Price, payment status and entitlement are decided
 * server-side. verifyPayment never asserts success — it reports what the
 * backend verified.
 */
import { PaymentProvider } from "./PaymentProvider.js";
import { PAYMENT_STATUS } from "../billing/catalog.js";

export class SupabaseProvider extends PaymentProvider {
  /**
   * @param {object} [client] Supabase client (injected for tests). Defaults to
   *   the shared app client, imported lazily so test envs need no real client.
   */
  constructor(client = null) {
    super({ id: "supabase", label: "Supabase backend", connected: !!client });
    this._client = client;
  }

  async _db() {
    if (this._client) return this._client;
    const { supabase } = await import("../services/supabase/client.js");
    if (!supabase) throw new Error("supabase client not configured");
    this._client = supabase;
    return supabase;
  }

  /**
   * @param order {{ kind, itemId, idempotencyKey, companyId? }}
   * kind is informational; the server resolves everything from the product code.
   */
  async createPayment(order) {
    if (!order?.idempotencyKey) throw new Error("idempotencyKey required");
    const db = await this._db();
    const { data, error } = await db.functions.invoke("create-payment-order", {
      body: {
        product_code: order.itemId,
        company_id: order.companyId ?? null,
        idempotency_key: order.idempotencyKey,
        provider: "sandbox", // real gateways stay disabled server-side
      },
    });
    if (error) throw new Error(error.message || "create-payment-order failed");
    const o = data?.order;
    if (!o) throw new Error(data?.error || "no order returned");
    return {
      ref: o.order_id,
      kind: o.kind,
      amount: o.amount,
      currency: o.currency,
      status: o.status, // 'created' — nothing unlocked
      backend: true,
    };
  }

  async checkPaymentStatus(ref) {
    const db = await this._db();
    const { data, error } = await db
      .from("payment_orders")
      .select("status, amount")
      .eq("id", ref)
      .single();
    if (error) throw new Error(error.message || "status lookup failed");
    return { ref, status: data.status, amount: data.amount, backend: true };
  }

  /**
   * Verification is server-side. Returns the backend-confirmed status; a
   * verified 'paid' also triggers the (idempotent) entitlement grant server-side.
   */
  async verifyPayment(ref) {
    const db = await this._db();
    const { data, error } = await db.functions.invoke("verify-payment", {
      body: { order_id: ref },
    });
    if (error) throw new Error(error.message || "verify-payment failed");
    const status = data?.verified ? PAYMENT_STATUS.PAID : (data?.status ?? "unknown");
    return { ref, status, entitlementId: data?.entitlement_id ?? null, backend: true };
  }

  // Not wired server-side yet — explicit rather than a silent no-op.
  async cancelPayment() { throw new Error("cancelPayment: backend endpoint not implemented yet"); }
  async refundPayment() { throw new Error("refundPayment: backend endpoint not implemented yet"); }
  async getReceipt() { throw new Error("getReceipt: backend endpoint not implemented yet"); }
}
