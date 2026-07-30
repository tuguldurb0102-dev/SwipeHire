import { describe, it, expect } from "vitest";
import {
  EMPLOYER_PLANS, SEEKER_SERVICES, PAYMENT_STATUS,
  getEmployerPlan, getSeekerService, catalogPrice,
} from "../catalog.js";
import {
  isGranting, activeEmployerPlan, serviceCredits, allServiceCredits,
  purchaseDisplayState, planIncludes, canUseCredit, consumeCredit,
} from "../entitlements.js";
import { normalizeKind } from "../catalog.js";

describe("catalog", () => {
  it("has the five employer plans at the brief's annual prices", () => {
    expect(getEmployerPlan("free").annual).toBe(0);
    expect(getEmployerPlan("starter").annual).toBe(1_990_000);
    expect(getEmployerPlan("professional").annual).toBe(3_990_000);
    expect(getEmployerPlan("business").annual).toBe(5_990_000);
    expect(getEmployerPlan("enterprise").annual).toBeNull(); // custom
  });

  it("has the five seeker services at the brief's prices", () => {
    const price = (id) => getSeekerService(id).price;
    expect(price("cv_rewrite")).toBe(2_000);
    expect(price("cover_letter")).toBe(2_000);
    expect(price("interview_prep")).toBe(5_000);
    expect(price("premium_cv")).toBe(3_000);
    expect(price("career_ai")).toBe(5_000);
    expect(SEEKER_SERVICES).toHaveLength(5);
  });

  it("catalogPrice is the authoritative server-side price lookup", () => {
    expect(catalogPrice("employer_plan", "starter")).toBe(1_990_000);
    expect(catalogPrice("seeker_service", "premium_cv")).toBe(3_000);
    expect(catalogPrice("employer_plan", "nope")).toBeNull();
  });
});

describe("entitlements — the verify-only rule", () => {
  it("grants nothing for an unpaid order", () => {
    for (const s of ["pending", "processing", "failed", "cancelled", "expired"]) {
      expect(isGranting({ status: s })).toBe(false);
    }
    expect(isGranting({ status: PAYMENT_STATUS.PAID })).toBe(true);
  });

  it("a pending employer order does NOT unlock a plan (stays FREE)", () => {
    const orders = [{ kind: "employer_plan", planId: "professional", status: "pending" }];
    expect(activeEmployerPlan(orders).id).toBe("free");
  });

  it("a paid employer order activates the plan", () => {
    const orders = [{ kind: "employer_plan", planId: "professional", status: "paid" }];
    expect(activeEmployerPlan(orders).id).toBe("professional");
  });

  it("picks the highest tier among multiple paid plans", () => {
    const orders = [
      { kind: "employer_plan", planId: "starter", status: "paid" },
      { kind: "employer_plan", planId: "business", status: "paid" },
    ];
    expect(activeEmployerPlan(orders).id).toBe("business");
  });

  it("treats an expired paid order as inactive", () => {
    const now = 1_000_000;
    const orders = [{ kind: "employer_plan", planId: "business", status: "paid", expiresAt: now - 1 }];
    expect(activeEmployerPlan(orders, now).id).toBe("free");
  });
});

describe("entitlements — seeker service credits", () => {
  const purchases = [
    { kind: "seeker_service", serviceId: "cv_rewrite", status: "paid" },
    { kind: "seeker_service", serviceId: "cv_rewrite", status: "paid", usedAt: 123 },
    { kind: "seeker_service", serviceId: "cv_rewrite", status: "pending" }, // not counted
    { kind: "seeker_service", serviceId: "career_ai", status: "paid" },
  ];

  it("counts only verified purchases and splits used/available", () => {
    const c = serviceCredits(purchases, "cv_rewrite");
    expect(c).toEqual({ serviceId: "cv_rewrite", total: 2, used: 1, available: 1 });
  });

  it("summarises all services", () => {
    const all = allServiceCredits(purchases);
    expect(all.find((c) => c.serviceId === "career_ai").available).toBe(1);
  });
});

describe("entitlements — display buckets", () => {
  const cases = [
    ["pending", "processing"],
    ["processing", "processing"],
    ["failed", "failed"],
    ["cancelled", "failed"],
    ["expired", "expired"],
    ["refunded", "refunded"],
    ["partially_refunded", "refunded"],
  ];
  it.each(cases)("maps %s → %s", (status, bucket) => {
    expect(purchaseDisplayState({ status })).toBe(bucket);
  });

  it("paid → available, or used when consumed", () => {
    expect(purchaseDisplayState({ status: "paid" })).toBe("available");
    expect(purchaseDisplayState({ status: "paid", usedAt: 1 })).toBe("used");
  });
});

describe("planIncludes is a capability check, not enforcement", () => {
  it("reports advanced AI search per plan", () => {
    expect(planIncludes(getEmployerPlan("professional"), "advancedAiSearch")).toBe(true);
    expect(planIncludes(getEmployerPlan("starter"), "advancedAiSearch")).toBe(false);
  });
});

describe("kind normalization", () => {
  it("accepts job_seeker_service as an alias of seeker_service", () => {
    expect(normalizeKind("job_seeker_service")).toBe("seeker_service");
    expect(normalizeKind("seeker_service")).toBe("seeker_service");
    expect(normalizeKind("employer_plan")).toBe("employer_plan");
  });
});

describe("seeker credit creation", () => {
  const paidRecord = (over = {}) => ({ kind: "seeker_service", serviceId: "cv_rewrite", ref: "r1", status: "paid", ...over });

  it("only a verified paid purchase creates an available credit", () => {
    for (const s of ["pending", "processing", "failed", "cancelled", "expired", "refunded"]) {
      expect(serviceCredits([paidRecord({ status: s })], "cv_rewrite").available).toBe(0);
    }
    expect(serviceCredits([paidRecord()], "cv_rewrite").available).toBe(1);
  });

  it("a verified purchase yields exactly one available credit", () => {
    const c = serviceCredits([paidRecord()], "cv_rewrite");
    expect(c).toMatchObject({ total: 1, used: 0, available: 1 });
  });
});

describe("seeker credit consumption", () => {
  const base = [
    { kind: "seeker_service", serviceId: "cv_rewrite", ref: "avail", status: "paid" },
    { kind: "seeker_service", serviceId: "career_ai", ref: "pend", status: "pending" },
    { kind: "seeker_service", serviceId: "premium_cv", ref: "refd", status: "refunded" },
    { kind: "seeker_service", serviceId: "interview_prep", ref: "exp", status: "expired" },
  ];

  it("canUseCredit is true only for a verified, unused credit", () => {
    expect(canUseCredit(base[0])).toBe(true);
    expect(canUseCredit(base[1])).toBe(false); // pending
    expect(canUseCredit(base[2])).toBe(false); // refunded
    expect(canUseCredit(base[3])).toBe(false); // expired
    expect(canUseCredit({ ...base[0], usedAt: 1 })).toBe(false); // already used
  });

  it("consumes an available credit exactly once", () => {
    const r1 = consumeCredit(base, "avail", 1000);
    expect(r1.ok).toBe(true);
    const used = r1.purchases.find((p) => p.ref === "avail");
    expect(used.usedAt).toBe(1000);
    expect(serviceCredits(r1.purchases, "cv_rewrite").available).toBe(0);

    // second attempt fails — cannot use twice
    const r2 = consumeCredit(r1.purchases, "avail", 2000);
    expect(r2.ok).toBe(false);
  });

  it("refunded and expired credits cannot be consumed", () => {
    expect(consumeCredit(base, "refd").ok).toBe(false);
    expect(consumeCredit(base, "exp").ok).toBe(false);
  });

  it("pending credits cannot be consumed", () => {
    expect(consumeCredit(base, "pend").ok).toBe(false);
  });
});
