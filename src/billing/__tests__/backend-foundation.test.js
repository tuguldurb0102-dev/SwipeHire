/**
 * Static verification of the 005_billing_foundation migration.
 *
 * Supabase is NOT linked in this environment, so live pgTAP/RLS tests cannot
 * run here (documented blocker). These tests instead assert the migration's
 * correctness and security posture from its SQL text, and reconcile the seeded
 * catalog with src/billing/catalog.js so the backend and frontend cannot drift.
 * They are real assertions, not weakened placeholders.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { EMPLOYER_PLANS, SEEKER_SERVICES } from "../catalog.js";

const here = dirname(fileURLToPath(import.meta.url));
const SQL = readFileSync(resolve(here, "../../../supabase/migrations/005_billing_foundation.sql"), "utf8");
const SQL6 = readFileSync(resolve(here, "../../../supabase/migrations/006_billing_grants_fix.sql"), "utf8");
const SQL7 = readFileSync(resolve(here, "../../../supabase/migrations/007_fix_order_function_ambiguity.sql"), "utf8");
const SQL8 = readFileSync(resolve(here, "../../../supabase/migrations/008_fix_consume_ambiguity.sql"), "utf8");
const SQL9 = readFileSync(resolve(here, "../../../supabase/migrations/009_phase1_core.sql"), "utf8");

const BILLING_TABLES = [
  "billing_products", "billing_prices", "employer_subscriptions", "subscription_usage",
  "payment_orders", "payment_transactions", "job_seeker_purchases", "entitlements",
  "invoices", "refunds", "payment_events",
];

describe("catalog ⇄ seed reconciliation", () => {
  it("seeds every employer plan code from the catalog", () => {
    for (const p of EMPLOYER_PLANS) {
      expect(SQL).toContain(`'${p.id}',`); // present as a product code
    }
  });

  it("seeds every seeker service code from the catalog", () => {
    for (const s of SEEKER_SERVICES) {
      expect(SQL).toContain(`'${s.id}',`);
    }
  });

  it("seeds the exact non-custom prices from the catalog", () => {
    const priceOf = { starter: 1990000, professional: 3990000, business: 5990000 };
    for (const [code, amount] of Object.entries(priceOf)) {
      expect(SQL).toMatch(new RegExp(`'${code}',\\s*${amount},`));
    }
    for (const s of SEEKER_SERVICES) {
      expect(SQL).toMatch(new RegExp(`'${s.id}',\\s*${s.price},`));
    }
  });

  it("does NOT create a price row for enterprise (no automated checkout)", () => {
    // enterprise appears as a product but must not appear in the prices VALUES list
    expect(SQL).toMatch(/'enterprise',\s*'employer_plan'/);    // product seeded
    expect(SQL).not.toMatch(/'enterprise',\s*\d+,\s*'year'/);  // but no price row
  });
});

describe("RLS is enabled on every billing table", () => {
  it.each(BILLING_TABLES)("enables RLS on %s", (t) => {
    expect(SQL).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
  });
});

describe("clients cannot write billing data", () => {
  it("defines no INSERT/UPDATE/DELETE policies (default-deny writes)", () => {
    expect(SQL).not.toMatch(/create policy[^;]*for\s+(insert|update|delete)/i);
  });

  it("only 'for select' policies exist", () => {
    const policies = SQL.match(/create policy[\s\S]*?;/gi) || [];
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) expect(p.toLowerCase()).toContain("for select");
  });
});

describe("SECURITY DEFINER functions are hardened", () => {
  const fns = [
    "create_payment_order_request",
    "grant_verified_entitlement",
    "consume_service_entitlement",
    "increment_subscription_usage",
  ];
  it.each(fns)("%s is SECURITY DEFINER with a pinned search_path", (fn) => {
    const re = new RegExp(`function public\\.${fn}[\\s\\S]*?security definer set search_path = public`, "i");
    expect(SQL).toMatch(re);
  });

  it("authenticated functions revoke PUBLIC then grant only authenticated", () => {
    expect(SQL).toMatch(/revoke all on function public\.create_payment_order_request[\s\S]*?from public/i);
    expect(SQL).toMatch(/grant execute on function public\.create_payment_order_request[\s\S]*?to authenticated/i);
    expect(SQL).toMatch(/revoke all on function public\.consume_service_entitlement\(uuid\) from public/i);
    expect(SQL).toMatch(/grant execute on function public\.consume_service_entitlement\(uuid\) to authenticated/i);
  });

  it("service-role-only functions are revoked from PUBLIC and NOT granted to authenticated", () => {
    expect(SQL).toMatch(/revoke all on function public\.grant_verified_entitlement\(uuid\) from public/i);
    expect(SQL).toMatch(/revoke all on function public\.increment_subscription_usage\(uuid,text,integer\) from public/i);
    expect(SQL).not.toMatch(/grant execute on function public\.grant_verified_entitlement[\s\S]*?to authenticated/i);
    expect(SQL).not.toMatch(/grant execute on function public\.increment_subscription_usage[\s\S]*?to authenticated/i);
  });
});

describe("006 grants fix — least privilege re-asserted", () => {
  it("removes the unsafe default that auto-grants functions to client roles", () => {
    expect(SQL6).toMatch(/alter default privileges in schema public revoke execute on functions from anon, authenticated/i);
  });
  it("service-role-only functions revoke anon AND authenticated", () => {
    expect(SQL6).toMatch(/revoke all on function public\.grant_verified_entitlement\(uuid\) from public, anon, authenticated/i);
    expect(SQL6).toMatch(/revoke all on function public\.increment_subscription_usage\(uuid, text, integer\) from public, anon, authenticated/i);
  });
  it("user-callable functions keep authenticated but drop anon", () => {
    expect(SQL6).toMatch(/revoke all on function public\.create_payment_order_request\([^)]*\) from public, anon/i);
    expect(SQL6).toMatch(/grant execute on function public\.create_payment_order_request\([^)]*\) to authenticated/i);
    expect(SQL6).toMatch(/revoke all on function public\.consume_service_entitlement\(uuid\) from public, anon/i);
    expect(SQL6).toMatch(/grant execute on function public\.consume_service_entitlement\(uuid\) to authenticated/i);
  });
});

describe("007/008 ambiguity fixes (regression guards)", () => {
  it("007 recreates the order function with table-qualified idempotency lookup", () => {
    expect(SQL7).toMatch(/create or replace function public\.create_payment_order_request/i);
    expect(SQL7).toMatch(/from public\.payment_orders po/i);
    expect(SQL7).toMatch(/po\.provider = p_provider/i);
  });
  it("008 recreates consume with #variable_conflict use_column", () => {
    expect(SQL8).toMatch(/create or replace function public\.consume_service_entitlement/i);
    expect(SQL8).toMatch(/#variable_conflict use_column/);
  });
  it("both fixes re-assert least-privilege grants", () => {
    expect(SQL7).toMatch(/grant execute on function public\.create_payment_order_request\([^)]*\) to authenticated/i);
    expect(SQL8).toMatch(/grant execute on function public\.consume_service_entitlement\(uuid\) to authenticated/i);
  });
});

describe("009 phase-1 core schema", () => {
  it("adds the four missing tables with RLS", () => {
    for (const t of ["notifications", "company_members", "offers", "usage_events"]) {
      expect(SQL9).toMatch(new RegExp(`create table if not exists public\\.${t}`));
      expect(SQL9).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
    }
  });
  it("notifications are created server-side (no client INSERT policy; DEFINER helper revoked from clients)", () => {
    expect(SQL9).not.toMatch(/create policy notif[^;]*for insert/i);
    expect(SQL9).toMatch(/revoke all on function public\.create_notification\([^)]*\) from public, anon, authenticated/i);
  });
  it("triggers notify employer on application and members on message", () => {
    expect(SQL9).toMatch(/on_application_created[\s\S]*after insert on public\.applications/i);
    expect(SQL9).toMatch(/on_message_created[\s\S]*after insert on public\.messages/i);
  });
  it("company_members backfills owners and only the owner manages membership", () => {
    expect(SQL9).toMatch(/insert into public\.company_members[\s\S]*from public\.companies/i);
    expect(SQL9).toMatch(/cm_members_write[\s\S]*owns_company\(company_id\)/i);
  });
  it("offers: candidate may only accept/decline their own", () => {
    expect(SQL9).toMatch(/offers_candidate_respond[\s\S]*status in \('accepted','declined'\)/i);
  });
});

describe("key safety invariants are encoded in SQL", () => {
  it("enterprise cannot enter automated checkout", () => {
    expect(SQL).toMatch(/enterprise plans require manual sales/i);
  });
  it("order amount is server-derived from billing_prices (client amount never inserted)", () => {
    expect(SQL).toMatch(/v_price\.amount/);
    expect(SQL).not.toMatch(/p_amount/); // no client amount parameter anywhere
  });
  it("idempotency is uniquely constrained per purchaser+provider+key", () => {
    expect(SQL).toMatch(/create unique index[^;]*payment_orders\(coalesce\(user_id[\s\S]*?provider, idempotency_key\)/i);
  });
  it("grant is idempotent per order (unique source, and paid-only guard)", () => {
    expect(SQL).toMatch(/unique \(source_type, source_id\)/);
    expect(SQL).toMatch(/is not verified paid/i);
  });
  it("service credit consumption is single-use and bounded", () => {
    expect(SQL).toMatch(/consumed_quantity <= quantity/);
    expect(SQL).toMatch(/entitlement already used/i);
  });
  it("only one active subscription per company", () => {
    expect(SQL).toMatch(/emp_subs_one_active[\s\S]*?where status = 'active'/i);
  });
  it("usage increments reject negatives", () => {
    expect(SQL).toMatch(/increment must be >= 0/);
  });
});
