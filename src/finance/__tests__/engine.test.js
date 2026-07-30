import { describe, it, expect } from "vitest";
import {
  computeKpis, breakEven, forecast, aiCostCenter,
  employerMonthlyRevenue, seekerMonthlyRevenue, monthlyCost,
} from "../engine.js";
import { SEED_SCENARIO, AVG_AI_PRICE, MONTHLY_COST_TOTAL, MONTHLY_COST_STATED } from "../model.js";

describe("model constants", () => {
  it("averages the five AI service prices to 3,400₮", () => {
    expect(AVG_AI_PRICE).toBe(3400);
  });

  it("sums the itemised cost lines to 29,850,000₮ and records the brief's gap", () => {
    expect(MONTHLY_COST_TOTAL).toBe(29_850_000);
    expect(MONTHLY_COST_STATED - MONTHLY_COST_TOTAL).toBe(300_000);
  });
});

describe("seed scenario — revenue", () => {
  it("employer subscriptions: 299M annual → 24,916,667₮/month", () => {
    expect(employerMonthlyRevenue(SEED_SCENARIO)).toBeCloseTo(299_000_000 / 12, 2);
    expect(computeKpis(SEED_SCENARIO).employerRevenue).toBe(24_916_667);
  });

  it("seeker AI: 1,000 × 1 × 3,400 = 3,400,000₮/month", () => {
    expect(seekerMonthlyRevenue(SEED_SCENARIO)).toBe(3_400_000);
  });

  it("MRR = 28,316,667₮ and ARR = 339,800,000₮", () => {
    const k = computeKpis(SEED_SCENARIO);
    expect(k.mrr).toBe(28_316_667);
    expect(k.arr).toBe(339_800_000);
  });
});

describe("seed scenario — P&L", () => {
  it("monthly cost is the itemised 29,850,000₮", () => {
    expect(monthlyCost(SEED_SCENARIO)).toBe(29_850_000);
  });

  it("runs at a ~1,533,333₮/month loss, so it is not yet profitable", () => {
    const k = computeKpis(SEED_SCENARIO);
    expect(k.netProfit).toBe(-1_533_333);
    expect(k.profitable).toBe(false);
    expect(k.profitMargin).toBeCloseTo(-0.0542, 3);
  });

  it("burn rate equals the loss and runway on 30M is ~19.6 months", () => {
    const k = computeKpis(SEED_SCENARIO);
    expect(k.burnRate).toBe(1_533_333);
    expect(k.runwayMonths).toBeCloseTo(19.6, 1);
  });

  it("ARPU per employer is ~283,167₮ and LTV over 24 months is 5,980,000₮", () => {
    const k = computeKpis(SEED_SCENARIO);
    expect(k.arpu).toBe(283_167);
    expect(k.ltv).toBe(5_980_000);
  });
});

describe("break-even", () => {
  it("needs ~1,533,333₮ more per month, i.e. 6 more employers at the current mix", () => {
    const be = breakEven(SEED_SCENARIO);
    expect(be.alreadyProfitable).toBe(false);
    expect(be.revenueGap).toBe(1_533_333);
    expect(be.extraEmployersNeeded).toBe(6);
  });
});

describe("what-if simulator", () => {
  it("doubling employers flips the company to profit", () => {
    const scenario = {
      ...SEED_SCENARIO,
      employers: { starter: 120, professional: 60, business: 20, enterprise: 0 },
    };
    const k = computeKpis(scenario);
    expect(k.profitable).toBe(true);
    expect(k.netProfit).toBeGreaterThan(0);
  });

  it("raising seeker AI purchases lifts revenue linearly", () => {
    const base = computeKpis(SEED_SCENARIO).seekerRevenue;
    const doubled = computeKpis({ ...SEED_SCENARIO, aiPurchasesPerSeekerPerMonth: 2 }).seekerRevenue;
    expect(doubled).toBe(base * 2);
  });

  it("is deterministic — identical inputs give identical output", () => {
    const a = JSON.stringify(computeKpis(SEED_SCENARIO));
    const b = JSON.stringify(computeKpis(SEED_SCENARIO));
    expect(a).toBe(b);
  });

  it("computes CAC once a growth rate implies new customers", () => {
    const k = computeKpis({ ...SEED_SCENARIO, monthlyGrowthRate: 0.1, marketingSpend: 5_000_000 });
    // 100 employers × 10% = 10 new; 5,000,000 / 10 = 500,000₮ CAC
    expect(k.cac).toBe(500_000);
    expect(k.ltvCac).toBeGreaterThan(0);
  });
});

describe("forecast", () => {
  it("returns one row per month with a running cash balance", () => {
    const series = forecast({ ...SEED_SCENARIO, monthlyGrowthRate: 0.05 }, 12);
    expect(series).toHaveLength(12);
    expect(series[0].month).toBe(1);
    expect(series[11].employers).toBeGreaterThan(series[0].employers);
  });

  it("with growth, monthly loss shrinks over time", () => {
    const series = forecast({ ...SEED_SCENARIO, monthlyGrowthRate: 0.08 }, 12);
    expect(series[11].netProfit).toBeGreaterThan(series[0].netProfit);
  });
});

describe("AI cost center", () => {
  it("computes token cost, per-request cost and AI profit", () => {
    const r = aiCostCenter({
      inputTokens: 1_000_000, outputTokens: 500_000,
      inputPricePer1k: 0.5, outputPricePer1k: 1.5,
      requests: 1000, aiRevenue: 3_400_000,
    });
    // input 1,000,000/1000×0.5 = 500 ; output 500,000/1000×1.5 = 750 ; total 1,250
    expect(r.totalCost).toBe(1_250);
    expect(r.costPerRequest).toBe(1); // round(1.25)
    expect(r.aiProfit).toBe(3_398_750);
  });
});
