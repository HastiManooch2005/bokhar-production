# Frontend / Backend Compatibility

Status: Ready for review

This document maps frontend API calls (Bokhar-Frontend) to backend endpoints, identifies mismatches, and lists recommended fixes and prioritized action items.

Source of truth:
- Frontend: Bokhar-Frontend/src/api (order.js, auth.js, payment components)
- Backend: backend/ (wallet, order, users, urls)

---

## 1. Observed frontend → backend mappings
- getOrderSummary (api.post "/order/order-summary/") → backend: POST /api/order/order-summary/ (OrderSummaryAPIView)
  - Good: payload shape matches OrderCreateSerializer; used to show price preview.

- createOrder (fetch POST to "/orders/create/") → backend: NO MATCH FOUND
  - Observed file: Bokhar-Frontend/src/api/order.js
  - Issue: backend does not expose a public /orders/create/ endpoint. Orders are created either via payment flow (POST /api/payments/initiate/) or via wallet payment (POST /api/payments/wallet/pay/).
  - Impact: createOrder in frontend is likely legacy/unused or will 404 in production.

- PaymentCallback component GET "/payments/verify/" → backend: GET /api/payments/verify/ (PaymentVerifyView)
  - Mismatch: frontend expects JSON { success: true } and uses AJAX. Backend IMPLEMENTATION performs HTTP redirect to a frontend result URL after processing (suitable for browser redirect flow). See SECURITY.md and PAYMENTS.md for details.

- Wallet charge flow:
  - initiate: POST /api/payments/wallet/charge/ (WalletChargeView)
  - verify: GET /api/payments/wallet/verify/ (WalletChargeVerifyView)
  - Frontend: Wallet charge components use redirect-based flow (open gateway, then callback). Confirmed compatibility.

- Order summary and payment initiation in Order page:
  - Frontend uses axios.post(`${API_URL}/payments/initiate/`, payload) — matches backend POST /api/payments/initiate/ (PaymentInitiateView).

- Time capacity check: GET /orders/check-capacity/ (frontend) → backend: /api/order/check-capacity/ or similar. Verify exact path; if mismatch found adjust frontend constant.

---

## 2. Missing from backend (used by frontend)
- POST /orders/create/ — frontend's createOrder uses this. Backend does not implement this endpoint. Options:
  1. Remove/replace createOrder usage in frontend to call payments/initiate or payments/wallet/pay as appropriate. (Recommended)
  2. Add a backward-compatible endpoint /orders/create/ in backend that proxies to the existing initiate/pay flows.

---

## 3. Missing from frontend (documented but unused)
- Several backend admin endpoints (bulk status change endpoints) are not used by public frontend — they are intended for seller/admin panel. No immediate action required unless a seller dashboard will call them.

---

## 4. Potential bugs and UX mismatches (priority)
1. Payment verify flow (High)
   - Problem: Frontend PaymentCallback.jsx calls GET /payments/verify/ via AJAX and expects JSON. Backend returns an HttpResponseRedirect which will cause AJAX to receive a 302 and follow or receive HTML, not the expected JSON.
   - Impact: Payment callbacks in SPA may show wrong status or fail to show order success.
   - Options to resolve (no-code-doc recommendations):
     - Backend: Detect AJAX requests (X-Requested-With or Accept header) and return JSON { success: true, order_id, redirect_url } instead of redirect.
     - Frontend: Use full-page redirect flow for payment verification, letting backend do the redirect, and provide a dedicated frontend result route that reads query params and displays order status.
   - Recommendation: implement conditional JSON response on verify endpoint (backend) for best SPA UX.

2. createOrder path (Medium)
   - Problem: Frontend posts to /orders/create/ which backend lacks. This may be dead code, leftover from non-payment order creation flow.
   - Recommendation: Remove or update createOrder to call the canonical endpoints (/payments/initiate/ or /payments/wallet/pay/). Add feature-flagged fallback endpoint on backend if rollout requires it.

3. CSRF & CORS (Medium)
   - Frontend uses credentials: 'include' and axios withCredentials. Ensure backend CORS and CSRF settings allow the frontend origin and send cookies.

---

## 5. Actionable checklist (recommended order)
1. Update frontend createOrder to call /payments/initiate/ (for card/gateway flows) or /payments/wallet/pay/ (for wallet payments). Remove fetch-based implementation that points to /orders/create/.
2. Modify backend /payments/verify/ to return JSON when Accept: application/json or X-Requested-With: XMLHttpRequest is present. Keep redirect behavior for browser flows.
3. Add automated tests that simulate gateway redirect and AJAX verify flows to prevent regressions.
4. Audit other frontend direct fetch(...) usages for hardcoded paths and align with backend URL namespace (/api/).

---

Next steps:
- Do a full grep for "fetch(" and axios usage across frontend to compile a complete map (can produce CSV or table). This was partially completed; run a repo-wide scan if desired.

