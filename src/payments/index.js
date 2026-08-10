/**
 * Payment provider registry.
 *
 * The app resolves a provider by id through this registry so the UI is never
 * coupled to a concrete backend. Only the sandbox is available today; the other
 * entries are declared as NOT connected so nothing can claim a live provider.
 *
 * When a real provider is configured (its Edge Functions deployed and secrets
 * set server-side), replace its `connected:false` placeholder with an actual
 * PaymentProvider implementation.
 */
import { SandboxProvider } from "./sandboxProvider.js";
import { SupabaseProvider } from "./supabaseProvider.js";

const sandbox = new SandboxProvider();
const supabaseBackend = new SupabaseProvider();

/** Declared future providers — none connected. Do not present these as live. */
export const PROVIDER_REGISTRY = Object.freeze({
  sandbox,
  supabase: supabaseBackend,
  qpay:       { id: "qpay",       label: "QPay",                connected: false },
  socialpay:  { id: "socialpay",  label: "SocialPay",           connected: false },
  storepay:   { id: "storepay",   label: "StorePay",            connected: false },
  card:       { id: "card",       label: "Bank card",           connected: false },
  apple_iap:  { id: "apple_iap",  label: "Apple In-App Purchase",connected: false },
  play_billing:{ id: "play_billing", label: "Google Play Billing", connected: false },
});

/**
 * The active provider. Sandbox is the DEFAULT — the live Supabase backend is
 * opt-in via VITE_BILLING_BACKEND=supabase, so nothing switches over until the
 * live path is verified (Step 7B). Any other value falls back to sandbox.
 */
const BACKEND = (typeof import.meta !== "undefined" && import.meta.env?.VITE_BILLING_BACKEND) || "sandbox";
export const activeProvider = BACKEND === "supabase" ? supabaseBackend : sandbox;
export const backendMode = BACKEND === "supabase" ? "supabase" : "sandbox";

export function getProvider(id) {
  const p = PROVIDER_REGISTRY[id];
  if (!p) throw new Error(`unknown provider: ${id}`);
  return p;
}

/** List of providers for a picker; flags which are actually usable. */
export function listProviders() {
  return Object.values(PROVIDER_REGISTRY).map((p) => ({
    id: p.id,
    label: p.label,
    connected: !!p.connected,
    isSandbox: !!p.isSandbox,
  }));
}

export { SandboxProvider } from "./sandboxProvider.js";
export { SupabaseProvider } from "./supabaseProvider.js";
export { PaymentProvider, isTerminalStatus, PROVIDER_CAPABILITIES } from "./PaymentProvider.js";
