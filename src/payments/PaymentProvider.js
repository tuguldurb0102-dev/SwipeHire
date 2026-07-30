/**
 * PaymentProvider — the adapter INTERFACE every payment backend must implement.
 *
 * The UI depends only on this shape, never on a concrete provider. Future
 * providers (QPay, SocialPay, StorePay, bank card gateway, Apple In-App
 * Purchase, Google Play Billing) each provide their own implementation.
 *
 * SECURITY CONTRACT (must hold for every real implementation):
 *  - createPayment / verifyPayment / refundPayment run against a trusted
 *    backend (Supabase Edge Function). Price and plan/service id are validated
 *    SERVER-SIDE from the catalog — never taken from the client.
 *  - verifyPayment is the ONLY source of truth for "paid". The UI must call it
 *    (or poll checkPaymentStatus until terminal) before granting entitlement.
 *  - Every createPayment call carries an idempotency key to prevent duplicate
 *    charges / duplicate entitlements.
 *
 * This file defines the contract and a no-op base; it performs no real payment.
 */
import { PAYMENT_STATUS } from "../billing/catalog.js";

export const PROVIDER_CAPABILITIES = Object.freeze({
  createPayment: "createPayment",
  checkPaymentStatus: "checkPaymentStatus",
  verifyPayment: "verifyPayment",
  cancelPayment: "cancelPayment",
  refundPayment: "refundPayment",
  getReceipt: "getReceipt",
});

const TERMINAL = [
  PAYMENT_STATUS.PAID, PAYMENT_STATUS.FAILED, PAYMENT_STATUS.CANCELLED,
  PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.REFUNDED, PAYMENT_STATUS.PARTIALLY_REFUNDED,
];

/** True once an order can no longer change state (stop polling). */
export const isTerminalStatus = (status) => TERMINAL.includes(status);

/**
 * Base class documenting the required methods. Concrete providers extend this.
 * The base intentionally throws so an unfinished provider can never silently
 * "succeed".
 */
export class PaymentProvider {
  /** @param {{id:string, connected:boolean, label:string}} meta */
  constructor(meta) {
    this.id = meta.id;
    this.label = meta.label;
    this.connected = !!meta.connected; // real providers set true only when configured
  }

  // eslint-disable-next-line no-unused-vars
  async createPayment(_order) { throw new Error(`${this.id}.createPayment not implemented`); }
  // eslint-disable-next-line no-unused-vars
  async checkPaymentStatus(_ref) { throw new Error(`${this.id}.checkPaymentStatus not implemented`); }
  // eslint-disable-next-line no-unused-vars
  async verifyPayment(_ref) { throw new Error(`${this.id}.verifyPayment not implemented`); }
  // eslint-disable-next-line no-unused-vars
  async cancelPayment(_ref) { throw new Error(`${this.id}.cancelPayment not implemented`); }
  // eslint-disable-next-line no-unused-vars
  async refundPayment(_ref, _amount) { throw new Error(`${this.id}.refundPayment not implemented`); }
  // eslint-disable-next-line no-unused-vars
  async getReceipt(_ref) { throw new Error(`${this.id}.getReceipt not implemented`); }
}
