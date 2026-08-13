import { describe, it, expect } from "vitest";
import { computePassportScore, verifiedSignals, isVerifiedDimension } from "../passport.js";

describe("computePassportScore", () => {
  it("is safe/empty for no candidate", () => {
    expect(computePassportScore(null)).toEqual({ total: 0, grade: "—", color: "#FF6B35", breakdown: [] });
  });

  it("scores a bare profile at 0", () => {
    expect(computePassportScore({}).total).toBe(0);
  });

  it("awards the verified dimension 10 per signal (max 30)", () => {
    const r = computePassportScore({ verified: { phone: true, id: true, skill: true } });
    expect(r.breakdown.find((b) => b.labelEn === "Verification").val).toBe(30);
    expect(r.total).toBe(30);
  });

  it("caps skills at 5 (×4 = 20) and certs at 3 (×5 = 15)", () => {
    const r = computePassportScore({ skills: ["a", "b", "c", "d", "e", "f"], certs: [1, 2, 3, 4] });
    expect(r.breakdown.find((b) => b.labelEn === "Skills").val).toBe(20);
    expect(r.breakdown.find((b) => b.labelEn === "Certs").val).toBe(15);
  });

  it("about tiers: >50 → 10, >10 → 5, else 0", () => {
    expect(computePassportScore({ about: "x".repeat(60) }).breakdown.find((b) => b.labelEn === "About").val).toBe(10);
    expect(computePassportScore({ about: "x".repeat(20) }).breakdown.find((b) => b.labelEn === "About").val).toBe(5);
    expect(computePassportScore({ about: "x" }).breakdown.find((b) => b.labelEn === "About").val).toBe(0);
  });

  it("tenure caps at 10 years", () => {
    expect(computePassportScore({ years: 40 }).breakdown.find((b) => b.labelEn === "Tenure").val).toBe(10);
  });

  it("is deterministic and grades a full profile A+", () => {
    const c = { verified: { phone: true, id: true, skill: true }, skills: ["a","b","c","d","e"], certs: [1,2,3], experience: [1,2,3], about: "x".repeat(60), years: 10 };
    const a = computePassportScore(c);
    const b = computePassportScore(c);
    expect(a).toEqual(b);
    expect(a.total).toBe(100);
    expect(a.grade).toBe("A+");
  });

  it("tags only the Verification dimension as verified (provided vs verified)", () => {
    const r = computePassportScore({ skills: ["a"] });
    expect(r.breakdown.filter((b) => b.verified).map((b) => b.labelEn)).toEqual(["Verification"]);
    expect(isVerifiedDimension("Verification")).toBe(true);
    expect(isVerifiedDimension("Skills")).toBe(false);
  });
});

describe("verifiedSignals", () => {
  it("reports the three attestable signals", () => {
    const s = verifiedSignals({ verified: { phone: true, id: false, skill: true } });
    expect(s.map((x) => [x.key, x.ok])).toEqual([["phone", true], ["id", false], ["skill", true]]);
  });
});
