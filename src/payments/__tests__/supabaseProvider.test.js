import { describe, it, expect, vi } from "vitest";
import { SupabaseProvider } from "../supabaseProvider.js";
import { backendMode, activeProvider } from "../index.js";
import { PAYMENT_STATUS } from "../../billing/catalog.js";

/** Minimal mock Supabase client capturing calls. */
function mockClient({ invoke, order } = {}) {
  return {
    functions: { invoke: invoke ?? vi.fn() },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: order ?? { status: "created", amount: 3000 }, error: null }),
        }),
      }),
    }),
  };
}

describe("default wiring stays on sandbox", () => {
  it("backendMode is sandbox unless VITE_BILLING_BACKEND=supabase", () => {
    expect(backendMode).toBe("sandbox");
    expect(activeProvider.id).toBe("sandbox");
  });
});

describe("SupabaseProvider — trust boundary", () => {
  it("createPayment sends only product code + idempotency (no amount)", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { order: { order_id: "o1", status: "created", amount: 3000, currency: "MNT", kind: "job_seeker_service" } },
      error: null,
    });
    const p = new SupabaseProvider(mockClient({ invoke }));
    const res = await p.createPayment({ kind: "job_seeker_service", itemId: "premium_cv", idempotencyKey: "k1" });

    const [fnName, opts] = invoke.mock.calls[0];
    expect(fnName).toBe("create-payment-order");
    expect(opts.body).toEqual({ product_code: "premium_cv", company_id: null, idempotency_key: "k1", provider: "sandbox" });
    expect(opts.body).not.toHaveProperty("amount"); // client never sends price
    expect(res).toMatchObject({ ref: "o1", status: "created", amount: 3000 });
  });

  it("requires an idempotency key", async () => {
    const p = new SupabaseProvider(mockClient());
    await expect(p.createPayment({ itemId: "premium_cv" })).rejects.toThrow(/idempotencyKey/);
  });

  it("verifyPayment reports backend-confirmed paid (does not assert success itself)", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { verified: true, status: "paid", entitlement_id: "e1" }, error: null });
    const p = new SupabaseProvider(mockClient({ invoke }));
    const res = await p.verifyPayment("o1");
    expect(invoke.mock.calls[0][0]).toBe("verify-payment");
    expect(res.status).toBe(PAYMENT_STATUS.PAID);
    expect(res.entitlementId).toBe("e1");
  });

  it("verifyPayment surfaces a non-paid status without granting", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { verified: false, status: "pending" }, error: null });
    const p = new SupabaseProvider(mockClient({ invoke }));
    const res = await p.verifyPayment("o1");
    expect(res.status).toBe("pending");
    expect(res.entitlementId).toBeNull();
  });

  it("checkPaymentStatus reads the order row", async () => {
    const p = new SupabaseProvider(mockClient({ order: { status: "paid", amount: 3000 } }));
    expect(await p.checkPaymentStatus("o1")).toMatchObject({ ref: "o1", status: "paid" });
  });

  it("cancel/refund/getReceipt are explicit not-implemented (no silent no-op)", async () => {
    const p = new SupabaseProvider(mockClient());
    await expect(p.cancelPayment()).rejects.toThrow(/not implemented/i);
    await expect(p.refundPayment()).rejects.toThrow(/not implemented/i);
    await expect(p.getReceipt()).rejects.toThrow(/not implemented/i);
  });

  it("surfaces backend errors instead of swallowing them", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { message: "forbidden" } });
    const p = new SupabaseProvider(mockClient({ invoke }));
    await expect(p.createPayment({ itemId: "premium_cv", idempotencyKey: "k1" })).rejects.toThrow(/forbidden/);
  });
});
