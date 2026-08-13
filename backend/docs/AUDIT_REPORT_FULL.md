Agent is idle (waiting for messages). agent_id: bokhar-api-audit, agent_type: explore, status: idle, description: Comprehensive API audit, elapsed: 5032s, total_turns: 1

[Turn 0]
Perfect! Now I have enough information to compile the audit report. Let me generate a comprehensive audit document based on all the data I've gathered.

## BOKHAR LAUNDRY PLATFORM API - COMPREHENSIVE AUDIT REPORT

---

# 1. BACKEND ENDPOINTS LIST

## A. Authentication & Users (`/api/users`)

| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/send/otp/` | POST | None | AllowAny | SendOTPSerializer | Send OTP to phone |
| `/verify/otp/` | POST | None | AllowAny | VerifyOTPSerializer | Verify OTP token |
| `/register/otp/` | POST | None | AllowAny | RegisterOTPSerializer | Register new user with OTP |
| `/login/otp/` | POST | None | AllowAny | LoginOTPSerializer | Login with OTP |
| `/login/` | POST | None | AllowAny | LoginPasswordSerializer | Login with password |
| `/send/otp/password/` | POST | JWT | IsAuthenticated | - | Send OTP for password reset |
| `/logout/` | POST | JWT | IsAuthenticated | - | Logout user |
| `/refresh/` | POST | None | AllowAny | - | Refresh JWT token |
| `/verify/` | GET | JWT | IsAuthenticated | - | Verify token validity |
| `/edit/name/` | PUT | JWT | IsAuthenticated | EditFullNameSerializer | Update user full name |
| `/edit/password/` | PUT | JWT | IsAuthenticated | EditPasswordSerializer | Change password |
| `/csrf/` | GET | None | - | - | Get CSRF token |
| `/customers/` | GET | JWT | IsAuthenticated | UserSerializer | List customers (ViewSet) |
| `/tickets/` | GET/POST | JWT | IsAuthenticated | - | List/Create user tickets |
| `/tickets/<id>/` | GET/DELETE | JWT | IsAuthenticated | - | Get/Delete ticket detail |
| `/tickets/<id>/messages/` | POST | JWT | IsAuthenticated | - | Send message on ticket |
| `/admin/tickets/` | GET | JWT | IsSeller | - | Admin: List all tickets |
| `/admin/tickets/<id>/reply/` | POST | JWT | IsSeller | - | Admin: Reply to ticket |
| `/sessions/` | GET | JWT | IsAuthenticated | - | List user sessions |
| `/sessions/<id>/` | DELETE | JWT | IsAuthenticated | - | Delete session |

## B. Products & Categories (`/api/products`, `/api/categories`)

| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/public/categories/` | GET | None | AllowAny | - | List categories (public) |
| `/public/products/` | GET | None | AllowAny | - | List products (public) |
| `/public/products/<id>/` | GET | None | AllowAny | - | Get product detail (public) |
| `/categories/` | GET | JWT | IsSeller | - | List categories (admin) |
| `/categories/<id>/` | GET | JWT | IsSeller | - | Get category (admin) |
| `/products/` | GET | JWT | IsSeller | - | List products (admin) |
| `/products/<id>/` | GET | JWT | IsSeller | - | Get product detail (admin) |
| `/products/create/` | POST | JWT | IsSeller | - | Create product (admin) |
| `/products/<id>/update/` | PUT | JWT | IsSeller | - | Update product (admin) |
| `/products/<id>/delete/` | DELETE | JWT | IsSeller | - | Delete product (admin) |
| `/products/search/` | GET | JWT | IsSeller | - | Search products (admin) |

## C. Cart Management (`/api/cart`)

| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/cart/` | GET | JWT | IsAuthenticated | - | Get user cart |
| `/cart/add/<product_id>/` | POST | JWT | IsAuthenticated | AddToCartSerializer | Add item to cart |
| `/cart/update/<id_unique>/` | PATCH | JWT | IsAuthenticated | - | Update cart item quantity |
| `/cart/remove/<id_unique>/` | POST | JWT | IsAuthenticated | - | Remove item from cart |
| `/cart/delete/` | POST | JWT | IsAuthenticated | - | Clear entire cart |

## D. Orders (`/api/order`)

### Order Summary & Creation
| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/order/order-summary/` | POST | JWT | IsAuthenticated | OrderCreateSerializer | Calculate order summary/Create order |
| `/order/check-capacity/` | GET | JWT | IsAuthenticated | - | Check delivery capacity for date/shift |
| `/order/validate-order/` | POST | JWT | IsAuthenticated | - | Validate order before payment |

### Addresses
| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/order/address/create/` | POST | JWT | IsAuthenticated | - | Create new address |
| `/order/address/list/` | GET | JWT | IsAuthenticated | - | List user addresses |
| `/order/address/update/<id>/` | PUT | JWT | IsAuthenticated | - | Update address |
| `/order/address/delete/<id>/` | DELETE | JWT | IsAuthenticated | - | Delete address |
| `/order/neshan/search/` | GET | None | - | - | Search location (Neshan API) |
| `/order/neshan/reverse/` | GET | None | - | - | Reverse geocoding (Neshan API) |

### Capacity Management
| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/order/rush-fee-settings/` | GET/PUT | JWT | IsAdminUser | - | Get/Update rush fee settings |
| `/order/delivery-templates/` | GET | JWT | IsAdminUser | - | List delivery templates |
| `/order/delivery-templates/<id>/update/` | PUT | JWT | IsAdminUser | - | Update delivery template |
| `/order/pickup-times/` | GET/POST | JWT | IsAdminUser | - | Manage pickup times |
| `/order/pickup-times/<id>/` | GET/PUT/DELETE | JWT | IsAdminUser | - | Pickup time detail |
| `/order/delivery-times/` | GET/POST | JWT | IsAdminUser | - | Manage delivery times |
| `/order/delivery-times/<id>/` | GET/PUT/DELETE | JWT | IsAdminUser | - | Delivery time detail |

### Admin Order Management
| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/order/list/paid/` | GET | JWT | IsSeller | - | List paid orders |
| `/order/list/washing/` | GET | JWT | IsSeller | - | List washing orders |
| `/order/list/delivered/` | GET | JWT | IsSeller | - | List delivered orders |
| `/order/list/canceled/` | GET | JWT | IsSeller | - | List canceled orders |
| `/order/list/returned/` | GET | JWT | IsSeller | - | List returned orders |
| `/order/search/` | GET | JWT | IsSeller | - | Search orders |
| `/order/status/pick/` | POST | JWT | IsSeller | - | Bulk update to pick status |
| `/order/status/washing/` | POST | JWT | IsSeller | - | Bulk update to washing status |
| `/order/status/delivery/` | POST | JWT | IsSeller | - | Bulk update to delivery status |
| `/order/<order_id>/history/` | GET | JWT | IsSeller | - | Order status history |

## E. Discounts (`/api/discounts`)

| Endpoint | Method | Auth | Permission | Serializer | Purpose |
|----------|--------|------|-----------|-----------|---------|
| `/discounts/product-discounts/` | GET/POST | JWT | IsSeller | ProductDiscountViewSet | Manage product discounts |
| `/discounts/product-discounts/<id>/` | GET/PUT/DELETE | JWT | IsSeller | - | Product discount detail |
| `/discounts/global-discounts/` | GET/POST | JWT | IsSeller | GlobalDiscountViewSet | Manage global discounts |
| `/discounts/global-discounts/<id>/` | GET/PUT/DELETE | JWT | IsSeller | - | Global discount detail |
| `/discounts/coupons/` | GET/POST | JWT | IsSeller | CouponViewSet | Manage coupons |
| `/discounts/coupons/<id>/` | GET/PUT/DELETE | JWT | IsSeller | - | Coupon detail |

## F. Payments & Wallet (`/api/payments`, `/api/wallet`)

### Order Payment
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/payments/initiate/` | POST | JWT | IsAuthenticated | Initiate payment for order |
| `/payments/verify/` | GET | JWT | - | Verify payment (callback from Zarinpal) |

### Wallet Management
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/payments/wallet/pay/` | POST | JWT | IsAuthenticated | Pay order with wallet balance |
| `/payments/wallet/charge/` | POST | JWT | IsAuthenticated | Initiate wallet charge |
| `/payments/wallet/charge/verify/` | GET | JWT | - | Verify wallet charge (callback) |
| `/payments/wallet/withdraw/` | POST | JWT | IsAuthenticated | Request wallet withdrawal to bank |
| `/payments/refund/` | POST | JWT | IsAuthenticated | Refund order to wallet/bank |
| `/refund/process/` | POST | JWT | IsAdminUser | Process refund request |

### OAuth (Bank Settlement)
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/oauth/initialize/` | POST | JWT | - | Initialize OAuth for bank connection |
| `/oauth/token/` | POST | JWT | - | Exchange OAuth code for token |

## G. Notifications (`/api/notifications`)

| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/notifications/` | GET | JWT | - | Get user notifications |
| `/notifications/sms-logs/` | GET | JWT | IsSeller | List SMS logs (ViewSet) |
| `/notifications/notifications-advertising/` | GET/POST | JWT | IsSeller | Manage advertising notifications (ViewSet) |
| `/notifications/notifications-late/` | GET/POST | JWT | IsSeller | Manage late notifications (ViewSet) |
| `/notifications/orders/notify/` | GET/POST | JWT | IsSeller | Manage order notifications (ViewSet) |
| `/notifications/coupon/<id>/` | POST | JWT | IsSeller | Send coupon via SMS |
| `/notifications/global-discount/<id>/` | POST | JWT | IsSeller | Send global discount via SMS |

## H. History & Discounts (notification URLs)

| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/notifications/wallet-transactions/` | GET | JWT | IsAuthenticated | Wallet transaction history |
| `/notifications/wallet/` | GET | JWT | IsAuthenticated | Wallet balance display |
| `/notifications/orders/history/` | GET | JWT | IsAuthenticated | User order history |
| `/notifications/order/history/<id>/` | GET | JWT | IsAuthenticated | Order detail history |
| `/notifications/coupons/` | GET | JWT | IsAuthenticated | User coupons list |
| `/notifications/discounts/` | GET | JWT | IsAuthenticated | Active discounts (authenticated) |
| `/notifications/discounts/all/` | GET | None | AllowAny | All active discounts (public) |

## I. Reports (`/api/report`)

### Customer Management
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/report/customers/` | GET | JWT | IsSeller | List all customers (with filters) |
| `/report/customers/search/` | GET | JWT | IsSeller | Search customers |
| `/report/customers/<id>/` | GET | JWT | IsSeller | Customer detail + orders |
| `/report/wallet/<user_id>/` | GET | JWT | IsSeller | Customer wallet detail |

### Order Reports
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/report/orders/` | GET | JWT | IsSeller | List orders (paginated) |
| `/report/orders/<id>/` | GET | JWT | IsSeller | Order detail |
| `/report/orders/today/` | GET | JWT | IsSeller | Today's orders |
| `/report/orders/status-distribution/` | GET | JWT | IsSeller | Order status distribution |

### Analytics
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/report/analytics/top-services/` | GET | JWT | IsSeller | Top services report |
| `/report/analytics/top-customers/` | GET | JWT | IsSeller | Top customers report |
| `/report/analytics/customers/no-orders/` | GET | JWT | IsSeller | Customers without orders |

### Financial Reports
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/report/monthly/price/<year>/<month>/` | GET | JWT | IsSeller | Monthly income report |
| `/report/monthly/count/<year>/<month>/` | GET | JWT | IsSeller | Monthly order count |
| `/report/income/` | GET | JWT | IsSeller | Income overview |
| `/report/weekly/sales/<year>/<month>/` | GET | JWT | IsSeller | Weekly sales |
| `/report/weekly/orders/<year>/<month>/` | GET | JWT | IsSeller | Weekly orders |
| `/report/delivery-performance/` | GET | JWT | IsSeller | Delivery performance metrics |
| `/report/export/income-excel/` | GET | JWT | IsSeller | Export income report as Excel |
| `/report/total-orders/` | GET | JWT | IsSeller | Total orders report |

### Dashboard
| Endpoint | Method | Auth | Permission | Purpose |
|----------|--------|------|-----------|---------|
| `/report/dashboard/` | GET | JWT | IsSeller | Main dashboard view |

---

# 2. FRONTEND API CALLS LIST

## A. Authentication API (`apiClient.js`)
- `POST /send/otp/` - Send OTP to register
- `POST /register/otp/` - Register with OTP + phone + fullname
- `POST /csrf/` - Get CSRF token
- `POST /refresh/` - Refresh JWT token
- `GET /verify/` - Verify token
- `POST /login/` - Login with password
- `POST /login/otp/` - Login with OTP

## B. Products & Categories (`clientApi.js`)
- `GET /public/categories/` - Fetch all categories
- `GET /public/products/` - Fetch all products
- `GET /public/products/<id>/` - Fetch product details
- `GET /products/` - Admin fetch products
- `GET /products/<id>/` - Admin fetch product
- `GET /products/search/?search=query` - Search products
- `GET /categories/` - Admin fetch categories
- `POST /discounts/product-discounts/` - Create product discount
- `GET /discounts/global-discounts/` - Fetch global discounts
- `POST /discounts/global-discounts/` - Create global discount
- `PUT /discounts/global-discounts/<id>/` - Update global discount
- `DELETE /discounts/global-discounts/<id>/` - Delete global discount
- `GET /discounts/coupons/` - Fetch coupons
- `POST /discounts/coupons/` - Create coupon
- `PUT /discounts/coupons/<id>/` - Update coupon
- `DELETE /discounts/coupons/<id>/` - Delete coupon

## C. Cart Operations (`cartService.js`)
- `GET /cart/` - Fetch cart
- `POST /cart/add/<product_id>/` - Add to cart
- `PATCH /cart/update/<id_unique>/` - Update quantity
- `POST /cart/remove/<id_unique>/` - Remove item
- `POST /cart/delete/` - Clear cart

## D. Order Management (`order.js`)
- `POST /order/order-summary/` - Calculate order pricing/Create order
- `POST /orders/create/` - Create order (fallback fetch)
- `GET /order/check-capacity/?date=YYYY-MM-DD&shift=morning|evening` - Check capacity
- `POST /order/validate-order/` - Validate order

## E. Addresses (`order.js`)
- `POST /order/address/create/` - Create address
- `GET /order/address/list/` - List addresses
- `PUT /order/address/update/<id>/` - Update address
- `DELETE /order/address/delete/<id>/` - Delete address
- `GET /order/neshan/search/` - Search location (Neshan)
- `GET /order/neshan/reverse/` - Reverse geo (Neshan)

## F. Capacity Settings (`capacityApi.js`)
- `GET /order/rush-fee-settings/` - Get rush fee settings
- `GET /order/delivery-templates/` - Get delivery templates
- `PUT /order/delivery-templates/<id>/update/` - Update delivery template
- `PUT /order/rush-fee-settings/` - Update rush fee settings
- `GET /order/check-capacity/` - Check capacity
- `POST /order/validate-order/` - Validate order

## G. Tickets (`ticketApi.js`)
- `GET /tickets/` - User tickets list
- `POST /tickets/` - Create ticket
- `GET /tickets/<id>/` - Get ticket detail
- `DELETE /tickets/<id>/` - Close ticket
- `POST /tickets/<id>/messages/` - Send message on ticket
- `GET /admin/tickets/` - Admin tickets list
- `POST /admin/tickets/<id>/reply/` - Admin reply to ticket

## H. Notifications
- `GET /notifications/` - Get notifications
- `POST /notifications/coupon/<id>/` - Send coupon SMS
- `POST /notifications/global-discount/<id>/` - Send discount SMS

## I. User Profile (`ProfileContext.jsx`)
- `PUT /edit/name/` - Update user name
- `PUT /edit/password/` - Change password
- `POST /send/otp/password/` - Send password OTP

## J. Customer Data
- `GET /customers/` - Get current user data
- `GET /customers/<id>/` - Get customer details
- `GET /customers/<id>/transactions/` - Customer transactions (unknown endpoint)

## K. Admin Reports
- `GET /report/customers/` - List customers
- `GET /report/customers/search/` - Search customers
- `GET /report/customers/<id>/` - Customer detail
- `GET /report/orders/` - List orders
- `GET /report/orders/<id>/` - Order detail
- `GET /report/dashboard/` - Dashboard
- Multiple analytics endpoints (top-services, top-customers, etc.)

---

# 3. MISMATCHES & GAPS

## Frontend Calls vs Backend Implementation

| Issue | Details |
|-------|---------|
| `/customers/<id>/transactions/` | Called in frontend but no URL pattern found |
| `/debug-cookies/` | Called in frontend but no URL pattern found |
| Order Creation | Frontend calls `/orders/create/` but backend uses `/order/order-summary/` |
| Payment Initiation | Frontend expects `/payments/initiate/` endpoint |
| Payment Status | Multiple payment callback endpoints exist but integration unclear |

---

# 4. PAYMENT FLOW

```
User Flow:
1. Create Order: POST /order/order-summary/
   - Receives: cart_items, pickup_date, delivery_date, address_id, coupon_code
   - Response: pricing breakdown

2. Initiate Payment: POST /payments/initiate/
   - Initiates payment via Zarinpal
   - Returns: payment authority/URL

3. User pays on Zarinpal

4. Verify Payment: GET /payments/verify/?Authority=xxx&Status=OK
   - Callback from Zarinpal
   - Creates order with status=PAID

Alternative Flows:
- Wallet Payment: POST /payments/wallet/pay/
  - Direct payment from wallet balance
  
- Wallet Charge: POST /payments/wallet/charge/
  - Add money to wallet, then verify with callback
  
- Refund: POST /payments/refund/
  - Full or partial refund to wallet or bank
```

---

# 5. ORDER STATE MACHINE

```
OrderStatus Choices:
- PAID ("paid", "پرداخت شده") ← Initial state after payment
- PICKED_UP ("picked_up", "دریافت از مشتری")
- WASHING ("washing", "در حال شستشو")
- DELIVERED ("delivered", "تحویل داده شده")
- CANCELED ("canceled", "لغو شده")
- RETURNED ("returned", "برگشتی")

Valid Transitions (implied by admin endpoints):
- PAID → PICKED_UP (status/pick/)
- PICKED_UP → WASHING (status/washing/)
- WASHING → DELIVERED (status/delivery/)
- Any → CANCELED (can refund)
- Any → RETURNED (after delivery)
```

---

# 6. AUTHENTICATION METHODS

| Method | Type | Implementation | Status |
|--------|------|-----------------|--------|
| OTP | SMS-based | SendOTPView, VerifyOTPView | ✅ Active |
| OTP Register | SMS + Registration | RegisterOTPView | ✅ Active |
| Password Login | Username/Password | LoginPasswordView | ✅ Active |
| JWT Refresh | Token-based | RefreshTokenView | ✅ Active |
| JWT Verify | Token validation | VerifyTokenView | ✅ Active |
| CSRF Protection | Cookie-based | get_csrf_token | ✅ Active |
| Session Auth | HTTP Cookie | Implicit (credentials: "include") | ✅ Active |

---

# 7. PERMISSION MATRIX

## Authentication Required
- **AllowAny**: OTP, Login, Register, Refresh, Verify, Public Products
- **IsAuthenticated**: Carts, Orders, Tickets, Wallet, User Profile, History
- **IsSeller**: Admin panels, Reports, Discounts, Order Management
- **IsAdminUser**: Capacity settings, Rush fees, Payment terminals

## Public Endpoints (No Auth)
1. `GET /public/categories/`
2. `GET /public/products/`
3. `GET /public/products/<id>/`
4. `GET /notifications/discounts/all/`
5. `POST /send/otp/`
6. `POST /verify/otp/`
7. `POST /register/otp/`
8. `POST /login/otp/`
9. `POST /login/`
10. `POST /refresh/`

---

# 8. CRITICAL FINDINGS

### ⚠️ Security Issues
1. **Order Creation Endpoint Mismatch**
   - Frontend expects `/orders/create/`
   - Backend implements `/order/order-summary/`
   - Risk: API misuse if not properly documented

2. **Missing Endpoints** (Frontend calls undefined)
   - `/customers/<id>/transactions/`
   - `/debug-cookies/`

3. **Payment Callback Handling**
   - GET `/payments/verify/` receives sensitive data (Authority) in URL
   - Should use POST with HTTPS-only

### ✅ Strengths
1. JWT + Session Auth combination
2. CSRF protection enabled
3. Permission decorators on sensitive endpoints
4. Pagination on reports
5. Separate public/admin API routes

### ⚠️ Gaps
1. No API rate limiting visible
2. No request validation middleware
3. Order state transitions not enforced (can transition from any state)
4. No audit logging on sensitive operations (partial)

---

# 9. AUTHENTICATION FLOW DIAGRAM

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       ├─→ POST /send/otp/ {phone}
       │   └─→ SMS sent
       │
       ├─→ POST /register/otp/ {phone, otp, fullname}
       │   └─→ User created + JWT in response
       │
       ├─→ JWT Token stored (cookie/localStorage)
       │
       ├─→ All authenticated requests include:
       │   - Authorization: Bearer <JWT>
       │   - X-CSRFToken: <csrf_token>
       │   - credentials: "include" (cookies)
       │
       ├─→ POST /refresh/ when token expires
       │   └─→ New JWT issued
       │
       └─→ POST /logout/
           └─→ Session invalidated
```

---

# 10. RECOMMENDATIONS

1. **Documentation Alignment**
   - Document `/order/order-summary/` vs `/orders/create/` discrepancy
   - Add missing endpoints or remove frontend calls

2. **Security Hardening**
   - Change GET `/payments/verify/` to POST
   - Implement rate limiting on OTP endpoints
   - Add request signing/verification

3. **Order State Machine**
   - Enforce valid state transitions in backend
   - Add middleware to prevent invalid transitions

4. **Audit Logging**
   - Log all payment operations
   - Log all order status changes
   - Log admin actions

5. **API Versioning**
   - Consider versioning endpoints (`/api/v1/`)
   - Prepare for future schema changes

---

**Report Generated**: 2026-08-13  
**Audit Scope**: Full Backend (40+ endpoints) + Frontend API Integration  
**Status**: ✅ Complete