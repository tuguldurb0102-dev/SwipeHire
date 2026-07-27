/**
 * Central legal / company configuration.
 *
 * Every legal placeholder the app or policies reference resolves here. Values
 * come from environment variables so real details are never invented or
 * committed. When a required value is missing the app is in a NON-LAUNCHABLE
 * state and `legalConfigComplete()` returns false — surface a development
 * warning rather than shipping blank policies.
 */

const env = import.meta.env;

export const LEGAL = Object.freeze({
  companyName:      env.VITE_LEGAL_COMPANY_NAME || "",
  regNumber:        env.VITE_LEGAL_REG_NUMBER || "",
  address:          env.VITE_LEGAL_ADDRESS || "",
  privacyEmail:     env.VITE_LEGAL_PRIVACY_EMAIL || "",
  supportEmail:     env.VITE_SUPPORT_EMAIL || "",
  retentionMonths:  env.VITE_DATA_RETENTION_MONTHS || "24",
  policyEffective:  env.VITE_POLICY_EFFECTIVE_DATE || "",
  policyVersion:    env.VITE_POLICY_VERSION || "2026-01-01",
  jurisdiction:     env.VITE_GOVERNING_JURISDICTION || "Монгол Улс",
});

/** The fields that must be set before a public launch. */
const REQUIRED = ["companyName", "regNumber", "address", "privacyEmail", "policyEffective"];

/** True only when every launch-required legal value is present. */
export function legalConfigComplete() {
  return REQUIRED.every((k) => LEGAL[k] && LEGAL[k].trim().length > 0);
}

/** Which required legal values are still missing (for the dev warning). */
export function missingLegalConfig() {
  return REQUIRED.filter((k) => !LEGAL[k] || !LEGAL[k].trim());
}
