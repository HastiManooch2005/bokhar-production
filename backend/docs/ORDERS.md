# Orders — Flow, State Machine, and API

Status: Ready for review (Draft → Review)

This document maps the order lifecycle, the API endpoints that operate on orders, permission rules, invalid transitions, and operational notes (capacity, pickups/deliveries).

Source of truth:
- backend: order/models.py, order/order_admin_view.py, order/summary_views.py, order/urls_app/
- frontend: Bokhar-Frontend (order creation and summary flows)

---

## 1. Order states
Derived from order.models.OrderStatus:
- pending (implicit during create step) — not explicitly stored as "pending" in model but exists conceptually during checkout
- PAID ("paid") — پرداخت شده (OrderStatus.PAID)
- PICKED_UP ("picked_up") — دریافت از مشتری (OrderStatus.PICKED_UP)
- WASHING ("washing") — در حال شستشو (OrderStatus.WASHING)
- DELIVERED ("delivered") — تحویل داده شده (OrderStatus.DELIVERED)
- CANCELED ("canceled") — لغو شده (OrderStatus.CANCELED)
- RETURNED ("returned") — برگشتی (OrderStatus.RETURNED)

Notes: the model sets status explicitly; newly created orders produced by payment flows have status PAID.

---

## 2. Canonical state transitions (implemented)
Based on backend admin views and services, the allowed transitions implemented in code are:

- PAID -> PICKED_UP  (UpdateStatusPickView — Seller only)
- PICKED_UP -> WASHING (UpdateStatusWashingView — Seller only)
- WASHING -> DELIVERED (UpdateStatusDeliveryView — Seller only)
- Any state -> CANCELED (implicitly supported — cancellation handling not exposed as a single public endpoint in codebase; see notes)
- PAID -> RETURNED (refund flow via WalletPaymentService.refund_order)

State transitions enforced in PaymentSession and PaymentService also include payment session-specific lifecycle (INITIATED -> PENDING -> PAID/FAILED/EXPIRED/CANCELED).

Diagram (text):

PAID
 ↓
PICKED_UP
 ↓
WASHING
 ↓
DELIVERED

Other flows:
- PAID -> RETURNED (refund)
- Any -> CANCELED (cancellation)

---

## 3. API endpoints (order-related)
All endpoints are mounted under `/api/` root. Key endpoints:

- POST /api/order/order-summary/  (OrderSummaryAPIView)
  - Auth: IsAuthenticated
  - Body: OrderCreateSerializer payload (address_id, pickup_date, pickup_shift, delivery_date, delivery_shift, coupon_code, cart_items[])
  - Response: pricing summary: items_price, pickup_cost, delivery_cost, rush_fee, percent_fee, discount, final_price
  - Purpose: preview & server-side pricing calculation (used by frontend getOrderSummary)

- POST /api/payments/initiate/  (PaymentInitiateView) — creates PaymentSession and calls gateway
  - Auth: IsAuthenticated
  - Body: same as OrderCreateSerializer
  - Response: payment_url, authority, payment_uuid
  - Purpose: create order via payment gateway flow (on verify the Order is created)

- (Wallet flow) POST /api/payments/wallet/pay/  (WalletPaymentView)
  - Auth: IsAuthenticated
  - Body: OrderCreateSerializer payload
  - Response: order_id, payment_uuid (immediate order creation using wallet balance)

- GET /api/order/orders/<filters> and admin lists
  - Several seller/admin endpoints: /api/order/list/paid/, /list/washing/, /list/delivered/, /list/canceled/, /list/returned/ — permission: IsSeller

- PUT /api/order/status/pick/ (UpdateStatusPickView)
  - Auth: IsSeller
  - Body: { ids: [1,2,3] }
  - Changes PAID -> PICKED_UP for orders in PAID

- PUT /api/order/status/washing/ (UpdateStatusWashingView)
  - Auth: IsSeller
  - Body: { ids: [..] }
  - Changes PICKED_UP -> WASHING

- PUT /api/order/status/delivery/ (UpdateStatusDeliveryView)
  - Auth: IsSeller
  - Body: { ids: [..] }
  - Changes WASHING -> DELIVERED

- GET /api/order/{order_id}/history/ (OrderStatusHistoryView)
  - Auth: IsSeller
  - Response: chronological status logs

- Address endpoints (used by order):
  - POST /api/order/address/create/  (CreateAddressView) — Auth: IsAuthenticated
  - GET /api/order/address/list/ — Auth: IsAuthenticated
  - PUT /api/order/address/update/{id}/ — Auth: IsAuthenticated
  - DELETE /api/order/address/delete/{id}/ — Auth: IsAuthenticated

Notes about order creation endpoint:
- Frontend sometimes calls `/orders/create/` (legacy helper in frontend) — backend canonical create is performed either via payment flow (/payments/initiate/) or the wallet pay flow (/payments/wallet/pay/). There is no plain `/orders/create/` public POST endpoint in backend; this mismatch is documented in FRONTEND_COMPATIBILITY.md and should be reconciled.

---

## 4. Cancel & Return flows

Cancel:
- There is no single public "cancel order" endpoint discovered in backend code. Cancelled orders are queried in CancelStatusView (seller view), and notifications exist for canceled orders. Likely cancellation is handled either in admin panel or by another internal view not found in the audit. Action: add an explicit cancellation endpoint if customers should be able to cancel via API.

Return/Refund:
- Refunds are initiated via POST /api/payments/refund/ (RefundOrderView) by authenticated users.
- RefundRequestSerializer validates order status (must be PAID) and prevents duplicate requests.
- Destination can be "wallet" (immediate wallet credit) or "bank" (admin processing queue).
- After wallet refund, order.status is set to RETURNED.

---

## 5. Invalid transitions (business rules)
- Cannot move PAID -> WASHING directly; admin views enforce sequence by filtering orders by expected from-status.
- Refunds allowed only for PAID orders.
- Withdrawal requests require cooldown and sufficient wallet balance.
- Payment verification enforces idempotency and amount matching — payment verify will fail if gateway amount != expected amount.

---

## 6. Permission matrix (summary)
- Public (no auth):
  - GET /api/public/products/ and /api/public/categories/
  - Static assets, schema endpoints (depending on setup)

- Authenticated (Customer):
  - Order summary (/api/order/order-summary/), address create/list/update/delete, initiate payment (/payments/initiate/), wallet operations (/payments/wallet/*), ticket creation, user profile edits, sessions.

- Seller (IsSeller):
  - Product/category management endpoints, order state transitions (PUT /api/order/status/*), order lists by status, report/dashboard endpoints (some report views may be seller-specific).

- Admin (IsAdminUser):
  - RefundProcessAPIView (POST /api/refund/process/), admin-only management endpoints.

---

## 7. Recommendations
1. Add an explicit, documented customer cancel endpoint with clear preconditions (e.g., allowed only before pickup or before a certain time) and automated refund triggers if needed.
2. Add server-side API for customer-facing order retrieval and modification if absent (e.g., GET /api/orders/{id}/ for customers).
3. Add API-level guards and tests for invalid transitions to ensure business rules don't regress.
4. Add a visual state diagram (PlantUML or Mermaid) to the docs for easy reference.

---

Next actions:
- Produce a Mermaid diagram and include in docs.
- Reconcile frontend createOrder vs backend flow (see FRONTEND_COMPATIBILITY.md).

