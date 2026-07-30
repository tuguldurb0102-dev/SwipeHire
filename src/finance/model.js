/**
 * SwipeHire business model — single source of truth for the Financial Center.
 *
 * All figures are in Mongolian Tögrög (MNT / ₮). Employer plans are billed
 * ANNUALLY; the engine converts to monthly where a monthly figure is needed.
 * Job-seeker AI services are per-purchase.
 *
 * These are the DEFAULT values from the business brief. The What-If simulator
 * overrides any of them at runtime without mutating this module.
 */

/** Employer subscription plans (annual price in ₮). Enterprise is custom. */
export const EMPLOYER_PLANS = Object.freeze({
  starter:      { id: "starter",      label: "Starter",      annual: 1_990_000 },
  professional: { id: "professional", label: "Professional", annual: 3_990_000 },
  business:     { id: "business",     label: "Business",     annual: 5_990_000 },
  enterprise:   { id: "enterprise",   label: "Enterprise",   annual: null }, // negotiated
});

/** Job-seeker one-off AI services (price per purchase in ₮). */
export const AI_SERVICES = Object.freeze({
  cv_rewrite:     { id: "cv_rewrite",     label: "AI CV Rewrite",         price: 2_000 },
  cover_letter:   { id: "cover_letter",   label: "AI Cover Letter",       price: 2_000 },
  interview_prep: { id: "interview_prep", label: "Interview Preparation", price: 5_000 },
  premium_cv:     { id: "premium_cv",     label: "Premium CV",            price: 3_000 },
  career_ai:      { id: "career_ai",      label: "Career AI",             price: 5_000 },
});

/** Average revenue per AI purchase, used when a specific product isn't given. */
export const AVG_AI_PRICE =
  Object.values(AI_SERVICES).reduce((s, x) => s + x.price, 0) /
  Object.values(AI_SERVICES).length; // = 3,400₮

/** Fixed monthly operating cost lines (₮). */
export const MONTHLY_COST_LINES = Object.freeze({
  salary:     18_000_000,
  office:      3_000_000,
  marketing:   5_000_000,
  ai_token:      800_000,
  cloud:         700_000,
  email:         250_000,
  sms:           300_000,
  storage:       300_000,
  monitoring:    200_000,
  security:      300_000,
  software:      500_000,
  other:         500_000,
});

/** Sum of the cost lines actually listed above. */
export const MONTHLY_COST_TOTAL =
  Object.values(MONTHLY_COST_LINES).reduce((s, x) => s + x, 0); // = 29,850,000₮

/**
 * The brief states a monthly total of 30,150,000₮. The itemised lines above
 * sum to 29,850,000₮ — a 300,000₮ discrepancy. The engine uses the itemised
 * sum (auditable), and exposes the stated figure so the UI can flag the gap
 * rather than hide it.
 */
export const MONTHLY_COST_STATED = 30_150_000;
export const MONTHLY_COST_DISCREPANCY = MONTHLY_COST_STATED - MONTHLY_COST_TOTAL;

/** One-off initial investment (₮), used for runway. */
export const INITIAL_INVESTMENT = 30_000_000;

/**
 * Default ("current") scenario from the brief:
 * 100 employers split 60/30/10, 1,000 seekers each buying ~1 AI service/month.
 */
export const SEED_SCENARIO = Object.freeze({
  employers: { starter: 60, professional: 30, business: 10, enterprise: 0 },
  enterpriseAvgAnnual: 0,            // set when enterprise deals exist
  seekers: 1_000,
  aiPurchasesPerSeekerPerMonth: 1,
  avgAiPrice: AVG_AI_PRICE,          // overridable in the simulator
  costLines: { ...MONTHLY_COST_LINES },
  initialInvestment: INITIAL_INVESTMENT,
  // Growth & unit-economics inputs (defaults; simulator overrides):
  monthlyGrowthRate: 0,              // fractional, e.g. 0.05 = 5%/month
  marketingSpend: MONTHLY_COST_LINES.marketing,
  newEmployersPerMonth: 0,           // for CAC; 0 = derive from growth
  avgEmployerLifetimeMonths: 24,     // for LTV
});
