import { describe, it, expect } from "vitest";
import { computeMatchScore, PROTECTED_ATTRIBUTES } from "../matching.js";

const base = {
  id: "c1", category: "Гагнуурчин", years: 5,
  skills: ["Гагнуур", "Металл"], certs: ["AWS D1.1"],
  about: "Туршлагатай гагнуурчин, барилгын салбарт олон жил ажилласан туршлагатай.",
  videoMode: "upload", verified: { phone: true, id: false, skill: true },
  skillTestCompleted: true, skillTestScore: 80,
};

describe("computeMatchScore — determinism", () => {
  it("returns an identical score for identical input across repeated calls", () => {
    const runs = Array.from({ length: 50 }, () => computeMatchScore(base, { matchCat: "Гагнуурчин" }).score);
    expect(new Set(runs).size).toBe(1);
  });

  it("never produces a value outside 0..99", () => {
    const maxed = { ...base, years: 99, skills: Array(50).fill("s"), certs: Array(20).fill("c"), skillTestScore: 100 };
    const empty = {};
    expect(computeMatchScore(maxed, { matchCat: "Гагнуурчин", minYears: 1 }).score).toBeLessThanOrEqual(99);
    expect(computeMatchScore(empty).score).toBeGreaterThanOrEqual(0);
  });
});

describe("computeMatchScore — fairness", () => {
  it("ignores gender entirely", () => {
    const male = computeMatchScore({ ...base, gender: "Эрэгтэй" }, { matchCat: "Гагнуурчин" }).score;
    const female = computeMatchScore({ ...base, gender: "Эмэгтэй" }, { matchCat: "Гагнуурчин" }).score;
    const none = computeMatchScore(base, { matchCat: "Гагнуурчин" }).score;
    expect(male).toBe(female);
    expect(male).toBe(none);
  });

  it("ignores age", () => {
    const young = computeMatchScore({ ...base, age: 19 }, { matchCat: "Гагнуурчин" }).score;
    const older = computeMatchScore({ ...base, age: 58 }, { matchCat: "Гагнуурчин" }).score;
    expect(young).toBe(older);
  });

  it("ignores name and photo", () => {
    const a = computeMatchScore({ ...base, name: "Батболд", photo: "x.jpg" }, {}).score;
    const b = computeMatchScore({ ...base, name: "Сарантуяа", photo: "y.jpg" }, {}).score;
    expect(a).toBe(b);
  });

  it("mutating any protected attribute never changes the score", () => {
    const control = computeMatchScore(base, { matchCat: "Гагнуурчин" }).score;
    for (const attr of PROTECTED_ATTRIBUTES) {
      const score = computeMatchScore({ ...base, [attr]: "ARBITRARY_VALUE" }, { matchCat: "Гагнуурчин" }).score;
      expect(score, `protected attribute "${attr}" leaked into scoring`).toBe(control);
    }
  });
});

describe("computeMatchScore — explainability", () => {
  it("returns a factor for every point awarded above the baseline", () => {
    const { score, factors } = computeMatchScore(base, { matchCat: "Гагнуурчин", minYears: 3 });
    const awarded = factors.reduce((sum, f) => sum + f.pts, 0);
    expect(score).toBe(Math.min(99, 40 + awarded));
    expect(factors.length).toBeGreaterThan(0);
    factors.forEach((f) => {
      expect(f.pts).toBeGreaterThan(0);
      expect(f.label).toBeTruthy();
    });
  });

  it("gives a neutral baseline to an empty profile rather than zero", () => {
    expect(computeMatchScore({}).score).toBe(40);
  });

  it("rewards a matching profession", () => {
    const match = computeMatchScore(base, { matchCat: "Гагнуурчин" }).score;
    const noMatch = computeMatchScore(base, { matchCat: "Мужаан" }).score;
    expect(match).toBeGreaterThan(noMatch);
  });
});
