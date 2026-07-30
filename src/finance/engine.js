/**
 * Financial engine — pure, deterministic KPI computation for the What-If
 * simulator and the admin Financial Center.
 *
 * Every function takes a scenario (see SEED_SCENARIO) and returns numbers.
 * No side effects, no I/O, no randomness — identical input → identical output,
 * so results are testable and reproducible. All money is ₮ (MNT).
 */
import { EMPLOYER_PLANS } from "./model.js";

const round = (n) => Math.round(n);

/** Monthly recurring revenue from employer subscriptions (annual → /12). */
export function employerMonthlyRevenue(scenario) {
  const e = scenario.employers || {};
  const annual =
    (e.starter || 0)      * EMPLOYER_PLANS.starter.annual +
    (e.professional || 0) * EMPLOYER_PLANS.professional.annual +
    (e.business || 0)     * EMPLOYER_PLANS.business.annual +
    (e.enterprise || 0)   * (scenario.enterpriseAvgAnnual || 0);
  return annual / 12;
}

/** Monthly revenue from job-seeker AI purchases. */
export function seekerMonthlyRevenue(scenario) {
  const seekers = scenario.seekers || 0;
  const perMonth = scenario.aiPurchasesPerSeekerPerMonth || 0;
  const price = scenario.avgAiPrice || 0;
  return seekers * perMonth * price;
}

/** Total fixed monthly operating cost (marketing override respected). */
export function monthlyCost(scenario) {
  const lines = { ...(scenario.costLines || {}) };
  if (typeof scenario.marketingSpend === "number") lines.marketing = scenario.marketingSpend;
  return Object.values(lines).reduce((s, x) => s + (x || 0), 0);
}

/** Total employer headcount across plans. */
export function employerCount(scenario) {
  const e = scenario.employers || {};
  return (e.starter || 0) + (e.professional || 0) + (e.business || 0) + (e.enterprise || 0);
}

/**
 * Core monthly P&L snapshot plus the headline SaaS metrics.
 */
export function computeKpis(scenario) {
  const empRev = employerMonthlyRevenue(scenario);
  const seekerRev = seekerMonthlyRevenue(scenario);
  const mrr = empRev + seekerRev;              // monthly recurring revenue
  const arr = mrr * 12;                        // annual run-rate
  const cost = monthlyCost(scenario);

  const grossProfit = mrr - cost;              // simple model: no separate COGS split
  const netProfit = grossProfit;               // no tax/other layer modelled yet
  const margin = mrr > 0 ? netProfit / mrr : 0;

  const employers = employerCount(scenario);
  const seekers = scenario.seekers || 0;

  // Burn & runway (only meaningful when losing money).
  const burnRate = netProfit < 0 ? -netProfit : 0;
  const runwayMonths = burnRate > 0
    ? (scenario.initialInvestment || 0) / burnRate
    : Infinity;

  // Unit economics.
  const arpu = employers > 0 ? mrr / employers : 0; // per paying employer
  const cac = cacValue(scenario);
  const ltv = ltvValue(scenario);
  const ltvCac = cac > 0 ? ltv / cac : Infinity;

  return {
    employerRevenue: round(empRev),
    seekerRevenue: round(seekerRev),
    monthlyRevenue: round(mrr),
    annualRevenue: round(mrr * 12),
    mrr: round(mrr),
    arr: round(arr),
    monthlyCost: round(cost),
    grossProfit: round(grossProfit),
    operatingProfit: round(grossProfit),
    netProfit: round(netProfit),
    profitMargin: margin,                      // fraction, e.g. -0.05
    profitable: netProfit >= 0,
    burnRate: round(burnRate),
    runwayMonths: runwayMonths === Infinity ? Infinity : round(runwayMonths * 10) / 10,
    employers,
    seekers,
    arpu: round(arpu),
    cac: round(cac),
    ltv: round(ltv),
    ltvCac: ltvCac === Infinity ? Infinity : Math.round(ltvCac * 100) / 100,
  };
}

/** Customer acquisition cost — marketing spend ÷ new employers acquired. */
export function cacValue(scenario) {
  const marketing = typeof scenario.marketingSpend === "number"
    ? scenario.marketingSpend
    : (scenario.costLines?.marketing || 0);
  let newCustomers = scenario.newEmployersPerMonth || 0;
  if (!newCustomers && scenario.monthlyGrowthRate) {
    newCustomers = employerCount(scenario) * scenario.monthlyGrowthRate;
  }
  return newCustomers > 0 ? marketing / newCustomers : 0;
}

/** Lifetime value — average monthly revenue per employer × expected lifetime. */
export function ltvValue(scenario) {
  const employers = employerCount(scenario);
  const perEmployerMonthly = employers > 0 ? employerMonthlyRevenue(scenario) / employers : 0;
  return perEmployerMonthly * (scenario.avgEmployerLifetimeMonths || 0);
}

/**
 * Break-even: additional monthly revenue needed to reach ₮0 profit, and — at
 * the current plan mix — how many more employers that implies.
 */
export function breakEven(scenario) {
  const k = computeKpis(scenario);
  const gap = k.monthlyCost - k.monthlyRevenue; // >0 means under water
  const arpu = k.arpu || 0;
  return {
    revenueGap: round(Math.max(0, gap)),
    alreadyProfitable: gap <= 0,
    extraEmployersNeeded: gap > 0 && arpu > 0 ? Math.ceil(gap / arpu) : 0,
  };
}

/**
 * Forecast N months forward, compounding employer growth monthly and holding
 * per-employer plan mix and seeker economics constant. Returns a series the UI
 * can chart.
 */
export function forecast(scenario, months = 12) {
  const growth = scenario.monthlyGrowthRate || 0;
  const baseEmployers = employerCount(scenario);
  const mix = scenario.employers || {};
  const out = [];
  let cash = scenario.initialInvestment || 0;

  for (let m = 1; m <= months; m++) {
    const factor = Math.pow(1 + growth, m);
    const scaled = {
      ...scenario,
      employers: {
        starter: (mix.starter || 0) * factor,
        professional: (mix.professional || 0) * factor,
        business: (mix.business || 0) * factor,
        enterprise: (mix.enterprise || 0) * factor,
      },
      // seekers assumed to grow with the same rate
      seekers: (scenario.seekers || 0) * factor,
    };
    const k = computeKpis(scaled);
    cash += k.netProfit;
    out.push({
      month: m,
      employers: round(baseEmployers * factor),
      mrr: k.mrr,
      netProfit: k.netProfit,
      cash: round(cash),
    });
  }
  return out;
}

/**
 * AI cost/revenue center. Given token usage and provider price, returns the
 * AI-specific P&L. Prices are ₮ per 1K tokens.
 */
export function aiCostCenter({
  inputTokens = 0,
  outputTokens = 0,
  inputPricePer1k = 0,
  outputPricePer1k = 0,
  requests = 0,
  employers = 0,
  seekers = 0,
  aiRevenue = 0,
} = {}) {
  const inputCost = (inputTokens / 1000) * inputPricePer1k;
  const outputCost = (outputTokens / 1000) * outputPricePer1k;
  const totalCost = inputCost + outputCost;
  return {
    inputTokens, outputTokens, totalTokens: inputTokens + outputTokens,
    inputCost: round(inputCost),
    outputCost: round(outputCost),
    totalCost: round(totalCost),
    costPerRequest: requests > 0 ? round(totalCost / requests) : 0,
    costPerEmployer: employers > 0 ? round(totalCost / employers) : 0,
    costPerSeeker: seekers > 0 ? round(totalCost / seekers) : 0,
    aiRevenue: round(aiRevenue),
    aiProfit: round(aiRevenue - totalCost),
    aiMargin: aiRevenue > 0 ? (aiRevenue - totalCost) / aiRevenue : 0,
  };
}
