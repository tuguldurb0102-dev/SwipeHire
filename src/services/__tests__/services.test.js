import { describe, it, expect } from "vitest";
import { signUp } from "../auth.service.js";
import { REQUIRED_CONSENTS, CONSENT_KINDS, setOptionalConsent, POLICY_VERSION } from "../consent.service.js";
import { REPORT_REASONS } from "../report.service.js";
import { VERIFICATION_KINDS } from "../account.service.js";
import { toServiceError, errorText } from "../supabase/errors.js";

/*
 * These cover the guards the service layer enforces BEFORE any network call,
 * plus error normalisation, so they behave identically whether or not
 * Supabase credentials are present in the environment.
 *
 * Anything requiring a live database is covered by
 * supabase/tests/rls_attack_tests.sql instead.
 */

describe("signUp — guards run before any network call", () => {
  it("refuses when the 18+ box is not ticked", async () => {
    await expect(
      signUp({ email: "a@b.mn", password: "longenough1", role: "candidate", is18Plus: false })
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("refuses a role the user must not self-assign", async () => {
    await expect(
      signUp({ email: "a@b.mn", password: "longenough1", role: "admin", is18Plus: true })
    ).rejects.toBeTruthy();
  });

  it("refuses a password shorter than 8 characters", async () => {
    await expect(
      signUp({ email: "a@b.mn", password: "short", role: "candidate", is18Plus: true })
    ).rejects.toMatchObject({ code: "weak_password" });
  });

  it("always rejects with a normalised, translatable error rather than a raw throw", async () => {
    // With env absent this is "not_configured"; with env present and no
    // network it is "network". Either way the UI receives a typed error with
    // both languages, never an unhandled crash.
    await expect(
      signUp({ email: "a@b.mn", password: "longenough1", role: "candidate", is18Plus: true })
    ).rejects.toMatchObject({ __isServiceError: true });
  });
});

describe("consent model", () => {
  it("treats terms, privacy, data processing and AI matching as required", () => {
    expect(REQUIRED_CONSENTS).toEqual([
      CONSENT_KINDS.TERMS,
      CONSENT_KINDS.PRIVACY,
      CONSENT_KINDS.DATA_PROCESSING,
      CONSENT_KINDS.AI_MATCHING,
    ]);
  });

  it("does not bundle marketing into the required set", () => {
    expect(REQUIRED_CONSENTS).not.toContain(CONSENT_KINDS.MARKETING);
  });

  it("refuses to revoke a required consent", async () => {
    await expect(setOptionalConsent(CONSENT_KINDS.TERMS, false)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("records a policy version so consent is auditable over time", () => {
    expect(POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("moderation and verification vocabularies", () => {
  it("offers the report reasons the UI shows", () => {
    expect(REPORT_REASONS).toContain("scam");
    expect(REPORT_REASONS).toContain("impersonation");
    expect(REPORT_REASONS).toContain("unauthorized_data");
  });

  it("does not expose an 'approved' verification kind a user could request", () => {
    expect(VERIFICATION_KINDS).toEqual(["phone", "identity", "company"]);
    expect(VERIFICATION_KINDS).not.toContain("approved");
  });
});

describe("error normalisation", () => {
  it("maps duplicate-signup to a specific message", () => {
    const e = toServiceError({ message: "User already registered" });
    expect(e.code).toBe("email_taken");
    expect(errorText(e, "mn")).toMatch(/бүртгэлтэй/);
  });

  it("maps an RLS refusal to a permission message, not a raw Postgres string", () => {
    const e = toServiceError({ message: 'new row violates row-level security policy' });
    expect(e.code).toBe("forbidden");
    expect(errorText(e, "en")).not.toMatch(/row-level/);
  });

  it("maps unauthenticated and rate-limited responses", () => {
    expect(toServiceError({ status: 401 }).code).toBe("not_authenticated");
    expect(toServiceError({ status: 429 }).code).toBe("rate_limited");
  });

  it("always yields a message in both languages", () => {
    const e = toServiceError(new Error("something bizarre"));
    expect(errorText(e, "mn")).toBeTruthy();
    expect(errorText(e, "en")).toBeTruthy();
  });

  it("never throws when given null", () => {
    expect(() => toServiceError(null)).not.toThrow();
  });
});
