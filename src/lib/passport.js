/**
 * Talent Passport scoring — pure, testable, framework-agnostic (V2 module).
 *
 * Extracted from SwipeHire.jsx so it can be unit-tested and reused. Behaviour is
 * identical to the original inline function (same total/grade/color/breakdown),
 * plus each breakdown dimension is tagged `verified: true|false` so the UI can
 * clearly distinguish VERIFIED signals (phone/id/skill, server-attestable) from
 * USER-PROVIDED ones (skills list, certs, experience, about, tenure).
 *
 * Max 100 pts across 6 dimensions:
 *   Verified (30) · Skills (20) · Certs (15) · Experience (15) · About (10) · Tenure (10)
 */

export function computePassportScore(c) {
  if (!c) return { total: 0, grade: "—", color: "#FF6B35", breakdown: [] };

  const verif = c.verified || {};
  const pts = {
    verified:   (verif.phone ? 10 : 0) + (verif.id ? 10 : 0) + (verif.skill ? 10 : 0),
    skills:     Math.min((c.skills?.length || 0) + (c.customSkills?.length || 0), 5) * 4,
    certs:      Math.min((c.certs?.length || 0), 3) * 5,
    experience: Math.min((c.experience?.length || 0), 3) * 5,
    about:      (c.about?.trim?.().length || 0) > 50 ? 10 : (c.about?.trim?.().length || 0) > 10 ? 5 : 0,
    tenure:     Math.min(c.years || 0, 10),
  };

  const total = Object.values(pts).reduce((a, b) => a + b, 0);
  const grade = total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B+" : total >= 60 ? "B" : "C";
  const color = total >= 80 ? "#3DDC97" : total >= 65 ? "#4FA3FF" : total >= 50 ? "#FFD23F" : "#FF6B35";

  const breakdown = [
    { label: "Баталгаажуулалт", labelEn: "Verification", val: pts.verified,   max: 30, verified: true },
    { label: "Ур чадвар",       labelEn: "Skills",       val: pts.skills,     max: 20, verified: false },
    { label: "Гэрчилгээ",       labelEn: "Certs",        val: pts.certs,      max: 15, verified: false },
    { label: "Туршлага",        labelEn: "Experience",   val: pts.experience, max: 15, verified: false },
    { label: "Танилцуулга",     labelEn: "About",        val: pts.about,      max: 10, verified: false },
    { label: "Ажлын жил",       labelEn: "Tenure",       val: pts.tenure,     max: 10, verified: false },
  ];

  return { total, grade, color, breakdown };
}

/** The verifiable trust signals and whether each is currently attested. */
export function verifiedSignals(c) {
  const v = c?.verified || {};
  return [
    { key: "phone", labelEn: "Phone verified", labelMn: "Утас баталгаажсан", ok: !!v.phone },
    { key: "id",    labelEn: "Identity verified", labelMn: "Иргэний үнэмлэх баталгаажсан", ok: !!v.id },
    { key: "skill", labelEn: "Skill verified", labelMn: "Ур чадвар баталгаажсан", ok: !!v.skill },
  ];
}

/** True if a dimension is a VERIFIED signal rather than user-provided. */
export function isVerifiedDimension(labelEn) {
  return labelEn === "Verification";
}
