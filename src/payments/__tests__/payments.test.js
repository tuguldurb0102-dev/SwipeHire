import { describe, it, expect, beforeEach } from "vitest";
import { SandboxProvider } from "../sandboxProvider.js";
import { getProvider, listProviders, isTerminalStatus } from "../index.js";
import { PAYMENT_STATUS } from "../../billing/catalog.js";

const order = (over = {}) => ({
  kind: "seeker_service", itemId: "premium_cv", idempotencyKey: "k1", ...over,
});

describe("sandbox provider — never fakes success", () => {
  let p;
  beforeEach(() => { p = new SandboxProvider(); });

  it("createPayment yields a pending order priced from the catalog, not the client", async () => {
    const o = await p.createPayment(order({ clientPrice: 1 }));
    expect(o.status).toBe(PAYMENT_STATUS.PENDING);
    expect(o.amount).toBe(3_000); // premium_cv catalog price, client's 1 ignored
    expect(o.isSandbox).toBe(true);
  });

  it("stays pending until an explicit resolve — no auto-success", async () => {
    const o = await p.createPayment(order());
    const v1 = await p.verifyPayment(o.ref);
    expect(v1.status).toBe(PAYMENT_STATUS.PENDING);

    p.resolve(o.ref, "success");
    const v2 = await p.verifyPayment(o.ref);
    expect(v2.status).toBe(PAYMENT_STATUS.PAID);
  });

  it("can resolve to failure", async () => {
    const o = await p.createPayment(order());
    p.resolve(o.ref, "fail");
    expect((await p.verifyPayment(o.ref)).status).toBe(PAYMENT_STATUS.FAILED);
  });

  it("idempotency key prevents a second order/charge", async () => {
    const a = await p.createPayment(order({ idempotencyKey: "same" }));
    const b = await p.createPayment(order({ idempotencyKey: "same" }));
    expect(b.ref).toBe(a.ref);
  });

  it("rejects an unknown catalog item", async () => {
    await expect(p.createPayment(order({ itemId: "nope" }))).rejects.toThrow();
  });

  it("requires an idempotency key", async () => {
    await expect(p.createPayment(order({ idempotencyKey: undefined }))).rejects.toThrow();
  });

  it("only refunds a paid order", async () => {
    const o = await p.createPayment(order());
    await expect(p.refundPayment(o.ref)).rejects.toThrow();
    p.resolve(o.ref, "success");
    expect((await p.refundPayment(o.ref)).status).toBe(PAYMENT_STATUS.REFUNDED);
  });

  it("partial refund is flagged distinctly", async () => {
    const o = await p.createPayment(order());
    p.resolve(o.ref, "success");
    expect((await p.refundPayment(o.ref, 1_000)).status).toBe(PAYMENT_STATUS.PARTIALLY_REFUNDED);
  });

  it("cannot resolve an already-terminal order", async () => {
    const o = await p.createPayment(order());
    p.resolve(o.ref, "success");
    expect(() => p.resolve(o.ref, "fail")).toThrow();
  });

  it("issues a demo-labelled receipt", async () => {
    const o = await p.createPayment(order());
    p.resolve(o.ref, "success");
    const r = await p.getReceipt(o.ref);
    expect(r.isSandbox).toBe(true);
    expect(r.note).toMatch(/DEMO/i);
  });
});

describe("registry", () => {
  it("only sandbox is usable; named future providers are not connected", () => {
    const list = listProviders();
    expect(getProvider("sandbox").isSandbox).toBe(true);
    for (const id of ["qpay", "socialpay", "storepay", "card", "apple_iap", "play_billing"]) {
      expect(getProvider(id).connected).toBe(false);
    }
    expect(list.some((p) => p.id === "qpay" && p.connected === false)).toBe(true);
  });

  it("isTerminalStatus distinguishes terminal vs in-flight", () => {
    expect(isTerminalStatus(PAYMENT_STATUS.PAID)).toBe(true);
    expect(isTerminalStatus(PAYMENT_STATUS.PENDING)).toBe(false);
  });
});
