/**
 * Billing catalog — the USER-FACING product catalog for the mobile app.
 *
 * This is distinct from src/finance/model.js: that module is company-level
 * planning/KPI input for the (future, separate) internal admin site and must
 * NEVER be surfaced in the app. THIS module is what a logged-in employer or
 * job seeker sees: plans they can buy and services they can purchase.
 *
 * Prices are in Mongolian Tögrög (₮). Employer plans bill ANNUALLY. Job-seeker
 * AI services are one-off per-purchase.
 *
 * IMPORTANT: plan limits below are DISPLAY metadata ("what the plan includes").
 * They are NOT enforced yet — the app has no usage counters for candidate
 * views / contacts / job posts / AI / team members. Enforcement is a separate,
 * explicitly-scoped later step. Do not silently gate features on these numbers.
 */

/** Bilingual label helper: { mn, en }. UI picks by current lang. */
const L = (mn, en) => ({ mn, en });

/** `Infinity` means unlimited; `null` means custom/negotiated. */
export const EMPLOYER_PLANS = Object.freeze([
  {
    id: "free",
    name: L("Үнэгүй", "Free"),
    annual: 0,
    tier: 0,
    limits: {
      candidateViewsPerMonth: 10,      // swipes
      savedCandidates: 3,
      candidateContacts: 1,
      activeJobPosts: 1,
      teamMembers: 1,
      advancedAiSearch: false,
      candidateComparison: false,
    },
    features: [
      L("Сард 10 нэр дэвшигч үзэх", "10 candidate swipes / month"),
      L("3 хадгалсан нэр дэвшигч", "3 saved candidates"),
      L("1 холбоо барих", "1 candidate contact"),
      L("1 идэвхтэй зар", "1 active job post"),
    ],
  },
  {
    id: "starter",
    name: L("Starter", "Starter"),
    annual: 1_990_000,
    tier: 1,
    limits: {
      candidateViewsPerMonth: 500,
      candidateContactsPerYear: 100,
      activeJobPosts: 10,
      teamMembers: 1,
      basicAiMatching: true,
      candidateComparison: false,
    },
    features: [
      L("Сард 500 нэр дэвшигч үзэх", "500 candidate views / month"),
      L("Жилд 100 холбоо барих", "100 candidate contacts / year"),
      L("10 идэвхтэй зар", "10 active job posts"),
      L("Үндсэн AI тохироо", "Basic AI matching"),
      L("Ярилцлагын урилга", "Interview invitations"),
      L("1 хэрэглэгч", "1 employer user"),
    ],
  },
  {
    id: "professional",
    name: L("Professional", "Professional"),
    annual: 3_990_000,
    tier: 2,
    popular: true,
    limits: {
      candidateViewsPerMonth: 2_000,
      candidateContactsPerYear: 500,
      activeJobPosts: Infinity,
      teamMembers: 5,
      advancedAiSearch: true,
      candidateComparison: true,
      analytics: true,
    },
    features: [
      L("Сард 2,000 нэр дэвшигч үзэх", "2,000 candidate views / month"),
      L("Жилд 500 холбоо барих", "500 candidate contacts / year"),
      L("Хязгааргүй зар", "Unlimited job posts"),
      L("Дэвшилтэт AI хайлт", "Advanced AI search"),
      L("Нэр дэвшигч харьцуулах", "Candidate comparison"),
      L("Ажилд авах шат (pipeline)", "Recruitment pipeline"),
      L("Аналитик", "Analytics"),
      L("Нэхэмжлэх татах", "Invoice download"),
      L("5 хүртэл гишүүн", "Up to 5 team members"),
    ],
  },
  {
    id: "business",
    name: L("Business", "Business"),
    annual: 5_990_000,
    tier: 3,
    limits: {
      candidateViewsPerMonth: Infinity,
      candidateContactsPerYear: Infinity,
      activeJobPosts: Infinity,
      teamMembers: 20,
      advancedAiSearch: true,
      candidateComparison: true,
      analytics: true,
      prioritySupport: true,
      apiAccess: "placeholder",        // future integration; not live
    },
    features: [
      L("Хязгааргүй нэр дэвшигч үзэх", "Unlimited candidate views"),
      L("Хязгааргүй холбоо барих", "Unlimited candidate contacts"),
      L("Хязгааргүй зар", "Unlimited job posts"),
      L("Дэвшилтэт AI тохироо", "Advanced AI matching"),
      L("Нэр дэвшигч харьцуулах", "Candidate comparison"),
      L("Бүрэн аналитик", "Full recruitment analytics"),
      L("Тэргүүлэх дэмжлэг", "Priority support"),
      L("20 хүртэл гишүүн", "Up to 20 team members"),
      L("API хандалт (ирээдүйд)", "API access (future)"),
    ],
  },
  {
    id: "enterprise",
    name: L("Enterprise", "Enterprise"),
    annual: null,                       // custom / negotiated
    tier: 4,
    custom: true,
    limits: {
      candidateViewsPerMonth: null,
      candidateContactsPerYear: null,
      activeJobPosts: null,
      teamMembers: null,
    },
    features: [
      L("Захиалгат хязгаар", "Custom limits"),
      L("Захиалгат гэрээ", "Custom contract"),
      L("Тусгайлсан дэмжлэг", "Dedicated support"),
      L("Захиалгат гишүүдийн тоо", "Custom team member limit"),
      L("Захиалгат интеграци", "Custom integrations"),
      L("Захиалгат тайлан", "Custom reporting"),
    ],
  },
]);

/** Job-seeker one-off AI services (price per purchase, ₮). */
export const SEEKER_SERVICES = Object.freeze([
  { id: "cv_rewrite",     name: L("AI CV засвар", "AI CV Rewrite"),           price: 2_000 },
  { id: "cover_letter",   name: L("AI гэмжих захидал", "AI Cover Letter"),    price: 2_000 },
  { id: "interview_prep", name: L("Ярилцлагын бэлтгэл", "Interview Preparation"), price: 5_000 },
  { id: "premium_cv",     name: L("Premium CV загвар", "Premium CV Template"), price: 3_000 },
  { id: "career_ai",      name: L("Карьерын AI зөвлөгөө", "Career AI Advice"), price: 5_000 },
]);

/** Payment/order lifecycle statuses (shared with the DB enum design). */
export const PAYMENT_STATUS = Object.freeze({
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
});

/** A verified-paid order is the ONLY thing that grants entitlement. */
export const GRANTING_STATUSES = Object.freeze([PAYMENT_STATUS.PAID]);

/** Canonical order kinds. `job_seeker_service` is an accepted alias. */
export const KIND = Object.freeze({ EMPLOYER_PLAN: "employer_plan", SEEKER_SERVICE: "seeker_service" });
const KIND_ALIASES = Object.freeze({
  employer_plan: "employer_plan",
  seeker_service: "seeker_service",
  job_seeker_service: "seeker_service",
});
/** Map any accepted kind spelling to its canonical value. */
export const normalizeKind = (k) => KIND_ALIASES[k] || k;

export const getEmployerPlan = (id) => EMPLOYER_PLANS.find((p) => p.id === id) || null;
export const getSeekerService = (id) => SEEKER_SERVICES.find((s) => s.id === id) || null;

/** Look up the authoritative price for an item. Never trust a client price. */
export function catalogPrice(kind, id) {
  const k = normalizeKind(kind);
  if (k === "employer_plan") return getEmployerPlan(id)?.annual ?? null;
  if (k === "seeker_service") return getSeekerService(id)?.price ?? null;
  return null;
}
