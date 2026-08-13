# Security Review and Recommendations

Status: Draft → Ready for review

This document summarizes the authentication strategy discovered in code, permission model, CSRF handling, and concrete recommendations to harden the API for production.

Source of truth:
- backend/users/views.py (jwt cookie helper _set_jwt_cookies)
- backend/settings.py (SIMPLE_JWT settings inspected)
- frontend axios config (withCredentials=true and X-CSRFToken usage)

---

## 1. Authentication strategy (Actual implementation)
The codebase uses cookie-based JWT (not Authorization: Bearer header) with CSRF protection:

- After login, access and refresh tokens are set as HttpOnly cookies by _set_jwt_cookies in users/views.py.
  - Access cookie name: configurable (commonly "access").
  - Refresh cookie name: configurable (commonly "refresh").
  - Cookies set with HttpOnly and Secure flags where settings allow.
- Frontend sends requests with credentials: axios/fetch use withCredentials=true.
- CSRF token: frontend reads CSRF cookie (csrftoken) and copies it into X-CSRFToken header for unsafe methods (POST/PUT/DELETE).
- Refresh flow: refresh endpoint reads refresh cookie and issues new access cookie.

Implication: APIs are protected by cookie-based JWT + standard Django CSRF. This works well with browser-based redirect flows (payment gateway redirect) and is preferred when using third-party gateways that redirect back to the app.

---

## 2. Exact flow (step-by-step)
1. User logs in via POST /api/auth/login/ (or equivalent): server responds with HttpOnly access + refresh cookies and may return user JSON.
2. Browser stores cookies automatically (can't be read by JS due to HttpOnly).
3. For unsafe requests, frontend must include the X-CSRFToken header with the value read from csrftoken cookie (Django's default CSRF cookie). The app already sets this header in axios config.
4. When the access cookie expires, frontend calls refresh endpoint (POST /api/auth/refresh/) which uses refresh cookie to issue a new access cookie.
5. Logout clears cookies via server-set Set-Cookie expired values.

Notes:
- Because tokens are in cookies, Authorization: Bearer headers are not required and are not in primary use in this codebase.

---

## 3. Permissions (recommended explicit mapping)
Every endpoint in docs must state one of these permission levels:
- Public (anonymous)
- Authenticated (any logged-in user)
- Customer (authenticated non-seller)
- Seller (IsSeller) — staff/merchant
- Admin (IsAdminUser)

Examples (from code):
- /api/order/order-summary/ — Authenticated (Customer)
- /api/payments/initiate/ — Authenticated (Customer)
- /api/payments/wallet/pay/ — Authenticated (Customer)
- /api/order/status/pick/ — Seller (IsSeller)
- /api/refund/process/ — Admin

---

## 4. CSRF handling and gateway redirects
- Gateway redirect flows (ZarinPal) that POST or GET back to /api/payments/verify/ rely on cookies for authentication. Because JWT is cookie-based, a browser redirect back to the site includes cookies automatically — ideal for payment verify endpoints implemented as HTTP redirects.
- Mismatch: frontend often calls /payments/verify/ via AJAX and expects JSON, but backend verify endpoint redirects. Two compatible strategies:
  1. Backend returns JSON when request has X-Requested-With: XMLHttpRequest (or Accept: application/json) — implement detection and conditional JSON response. This keeps nicer SPA UX.
  2. Frontend uses redirect-based flow: let gateway redirect the browser to a frontend route that parses query params (Authority, Status), then that page loads server response as needed. Because cookies are included, the verify view can redirect to a frontend result page with query params. This is the current backend behavior.

Recommendation: prefer option 1 (JSON on AJAX) to minimize UX surprises — document change request so backend team can implement safely.

---

## 5. Secrets and environment
- Payment gateway credentials (ZARINPAL_MERCHANT_ID, ZARINPAL_USE_SANDBOX) must be stored in env vars and never checked into source control.
- Django SECRET_KEY must be secure and rotated if leaked.
- Database credentials and third-party API keys must be in platform-specific secret store (Azure Key Vault, AWS Secrets Manager, etc.) in production.

---

## 6. Hardening recommendations
1. Enforce Secure, HttpOnly, SameSite=strict for JWT cookies in production to reduce CSRF/CSRF exploit surface. Consider SameSite=lax for payment gateway redirect compatibility but document trade-offs.
2. Set token lifetimes appropriately: access short (~5-15m), refresh longer (~7-30d). Use refresh rotation to reduce stolen-refresh vulnerability.
3. Rate-limit authentication and payment endpoints (login, initiate payment, verify) per IP and per user to reduce abuse.
4. Add Content Security Policy (CSP) headers and X-Frame-Options (DENY or SAMEORIGIN) to reduce clickjacking on payment pages.
5. Ensure verify endpoint validates gateway signature/amount thoroughly and uses DB-level locks (the code already uses advisory locks; keep them).
6. Log payment state transitions with immutable audit entries and error codes for troubleshooting.
7. Add unit and integration tests for cookie-based auth and gateway callback flows (simulate gateway redirect).

---

## 7. Short checklist for deploy
- [ ] Ensure all env secrets are configured in the deployment environment
- [ ] Enable HTTPS and set cookie Secure flag
- [ ] Configure SameSite policy and test redirect flows
- [ ] Add rate-limiting (e.g., using django-ratelimit or nginx-level limits)
- [ ] Run security scans (dependency check, SAST)

