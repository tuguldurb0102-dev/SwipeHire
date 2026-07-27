/**
 * Match scoring — pure, deterministic, auditable.
 *
 * Extracted from the UI so it can be unit-tested and reviewed on its own.
 *
 * Fairness constraints (deliberate and tested):
 *   • Protected attributes are NEVER inputs: gender, age, name, photo,
 *     marital status, place of origin.
 *   • Every point traces to a job-relevant, employer-visible signal and is
 *     returned in `factors` so any score can be explained.
 *   • The score is decision support only — it never filters a candidate out
 *     of the employer's view.
 *   • No randomness: the same inputs always produce the same score.
 */

/** Attributes that must never influence ranking. */
export const PROTECTED_ATTRIBUTES = Object.freeze([
  "gender", "age", "name", "full_name", "photo", "avatar",
  "maritalStatus", "origin", "nationality", "religion",
]);

/**
 * @param {object} c        candidate
 * @param {object} [opts]
 * @param {string} [opts.matchCat]  category parsed from the employer's query
 * @param {number} [opts.minYears]  minimum years requested
 * @returns {{score:number, factors:{label:string,labelEn:string,pts:number}[]}}
 */
export function computeMatchScore(c, { matchCat, minYears } = {}) {
  const factors = [];
  let score = 40; // neutral baseline — nobody starts disadvantaged

  if (matchCat && c.category === matchCat) {
    score += 22; factors.push({ label: "Мэргэжил тохирсон", labelEn: "Profession matches", pts: 22 });
  }

  const years = Number(c.years) || 0;
  if (years > 0) {
    const pts = Math.min(15, years * 2);
    score += pts; factors.push({ label: `${years} жилийн туршлага`, labelEn: `${years} years experience`, pts });
  }
  if (minYears > 0 && years >= minYears) {
    score += 8; factors.push({ label: "Шаардсан туршлага хангасан", labelEn: "Meets required experience", pts: 8 });
  }

  const skills = (c.skills?.length || 0) + (c.customSkills?.length || 0);
  if (skills > 0) {
    const pts = Math.min(10, skills * 2);
    score += pts; factors.push({ label: `${skills} ур чадвар`, labelEn: `${skills} skills listed`, pts });
  }

  const certs = c.certs?.length || 0;
  if (certs > 0) {
    const pts = Math.min(8, certs * 4);
    score += pts; factors.push({ label: `${certs} гэрчилгээ`, labelEn: `${certs} certificates`, pts });
  }

  if (c.skillTestCompleted && typeof c.skillTestScore === "number") {
    const pts = Math.round((c.skillTestScore / 100) * 10);
    score += pts; factors.push({ label: `Ур чадварын тест ${c.skillTestScore}%`, labelEn: `Skill test ${c.skillTestScore}%`, pts });
  }

  const v = c.verified || {};
  if (v.phone) { score += 3; factors.push({ label: "Утас баталгаажсан", labelEn: "Phone verified", pts: 3 }); }
  if (v.id)    { score += 3; factors.push({ label: "Иргэний үнэмлэх баталгаажсан", labelEn: "ID verified", pts: 3 }); }
  if (v.skill) { score += 4; factors.push({ label: "Ур чадвар баталгаажсан", labelEn: "Skill verified", pts: 4 }); }

  if ((c.about?.trim().length || 0) >= 50) {
    score += 4; factors.push({ label: "Дэлгэрэнгүй танилцуулга", labelEn: "Detailed bio", pts: 4 });
  }
  if (c.videoMode || c.videoFileName) {
    score += 5; factors.push({ label: "Видео CV байгаа", labelEn: "Has video CV", pts: 5 });
  }

  return { score: Math.max(0, Math.min(99, score)), factors };
}
