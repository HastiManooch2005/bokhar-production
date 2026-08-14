// src/api/walletApi.js
import { api } from "../pages/Order";

/**
 * D. POST /api/payments/wallet/charge/
 * Initiate wallet charge via ZarinPal gateway
 * @param {number} amountInRials - Amount in Rial (Toman * 10)
 * @returns {Promise<{payment_url: string, authority: string, payment_uuid: string}>}
 */
export const chargeWallet = (amountInRials) =>
  api.post("/payments/wallet/charge/", { amount: amountInRials });

/**
 * E. GET /api/payments/wallet/charge/verify/
 * Verify wallet charge after gateway callback
 * @param {string} authority - ZarinPal authority code
 * @param {string} status - "OK" or "NOK"
 * @returns {Promise<{success: boolean, ref_id?: string, message?: string}>}
 */
export const verifyWalletCharge = (authority, status) =>
  api.get("/payments/wallet/charge/verify/", {
    params: { Authority: authority, Status: status },
    headers: { Accept: "application/json" },
  });

/**
 * C. POST /api/payments/wallet/pay/
 * Pay for order using wallet balance
 * @param {Object} orderData - Same as OrderCreateSerializer
 * @returns {Promise<{order_id: number, payment_uuid: string}>}
 */
export const payWithWallet = (orderData) =>
  api.post("/payments/wallet/pay/", orderData);

/**
 * H. POST /api/payments/wallet/withdraw/
 * Request wallet withdrawal to bank account
 * @param {Object} data - { amount: number, iban: string, account_holder: string }
 * @returns {Promise<{success: boolean, withdrawal_id: string, message: string}>}
 */
export const requestWithdrawal = (data) =>
  api.post("/payments/wallet/withdraw/", data);

/**
 * F. POST /api/payments/refund/
 * Request refund for an order
 * @param {Object} data - { order: number, amount: number, destination: "wallet"|"bank", reason: string }
 * @returns {Promise<{detail: string, refund_id: string, destination: string}>}
 */
export const requestRefund = (data) =>
  api.post("/payments/refund/", data);

// Helper: Convert Toman to Rial
export const toRial = (toman) => toman * 10;

// Helper: Convert Rial to Toman
export const toToman = (rial) => Math.floor(rial / 10);