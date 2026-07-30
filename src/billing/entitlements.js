/**
 * Entitlements — pure functions that derive what a user is allowed to access
 * from their VERIFIED payment records. No React, no I/O, no time-of-click
 * unlocking. Access is a function of confirmed data only.
 *
 * Golden rule enforced here: an order grants nothing unless its status is in
 * GRANTING_STATUSES (i.e. server-verified `paid`). Clicking "Pay" does not
 * appear in this file at all — by design.
 */
import { PAYMENT_STATUS, GRANTING_STATUSES, getEmployerPlan, getSeekerService } from "./catalog.js";

/** Is this order in a state that grants access? */
export function isGranting(order) {
  return !!order && GRANTING_STATUSES.includes(order.status);
}

/**
 * Resolve the active employer plan from a list of orders.
 * @param orders  [{ kind:"employer_plan", planId, status, paidAt, expiresAt }]
 * @param now     ms timestamp (injected for determinism)
 * @returns the highest-tier plan whose order is paid and unexpired, else FREE.
 */
export function activeEmployerPlan(orders = [], now = Date.now()) {
  const active = orders
    .filter((o) => o.kind === "employer_plan" && isGranting(o))
    .filter((o) => !o.expiresAt || o.expiresAt > now)
    .map((o) => getEmployerPlan(o.planId))
    .filter(Boolean);
  if (active.length === 0) return getEmployerPlan("free");
  return active.reduce((best, p) => (p.tier > best.tier ? p : best), active[0]);
}

/**
 * Job-seeker service credits: how many purchased, unused, of a given service.
 * @param purchases [{ kind:"seeker_service", serviceId, status, usedAt }]
 */
export function serviceCredits(purchases = [], serviceId) {
  const rows = purchases.filter(
    (p) => p.kind === "seeker_service" && p.serviceId === serviceId && isGranting(p)
  );
  const total = rows.length;
  const used = rows.filter((p) => !!p.usedAt).length;
  return { serviceId, total, used, available: total - used };
}

/** All service credits keyed by serviceId. */
export function allServiceCredits(purchases = []) {
  const ids = [...new Set(purchases.map((p) => p.serviceId).filter(Boolean))];
  return ids.map((id) => serviceCredits(purchases, id));
}

/**
 * Map a raw payment record to the display bucket the Job Seeker Payments page
 * uses. Kept here so UI never re-derives status meaning.
 */
export function purchaseDisplayState(purchase) {
  if (!purchase) return "unknown";
  switch (purchase.status) {
    case PAYMENT_STATUS.PENDING: return "processing"; // awaiting provider
    case PAYMENT_STATUS.PROCESSING: return "processing";
    case PAYMENT_STATUS.PAID: return purchase.usedAt ? "used" : "available";
    case PAYMENT_STATUS.FAILED: return "failed";
    case PAYMENT_STATUS.CANCELLED: return "failed";
    case PAYMENT_STATUS.EXPIRED: return "expired";
    case PAYMENT_STATUS.REFUNDED:
    case PAYMENT_STATUS.PARTIALLY_REFUNDED: return "refunded";
    default: return "unknown";
  }
}

/**
 * Whether a specific feature is included in the user's active plan. This is a
 * capability CHECK for display ("your plan includes X"), NOT enforcement of
 * numeric usage limits (the app has no usage counters yet).
 */
export function planIncludes(plan, featureKey) {
  return !!plan?.limits?.[featureKey];
}

/**
 * A seeker-service purchase can be consumed only if it is a verified, unused
 * credit. pending/processing/failed/cancelled/refunded/expired and
 * already-used records cannot be used.
 */
export function canUseCredit(record) {
  return !!record
    && record.kind === "seeker_service"
    && isGranting(record)   // status === paid
    && !record.usedAt;
}

/**
 * Consume one credit by ref. Pure: returns a NEW purchases array and whether it
 * succeeded. Marking usedAt makes the credit inactive so it cannot be used
 * twice. Does not execute any service — consumption is entitlement-only.
 */
export function consumeCredit(purchases = [], ref, now = Date.now()) {
  let ok = false;
  const next = purchases.map((p) => {
    if (p.ref === ref && canUseCredit(p)) {
      ok = true;
      return { ...p, usedAt: now };
    }
    return p;
  });
  return { purchases: next, ok };
}
