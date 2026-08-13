# Error Codes & Responses

Status: Draft → Ready for review

This document collects common error responses, recommended standardized error envelope, and a list of observed error codes/messages from the codebase.

---

## 1. Standard error envelope
Recommended JSON envelope for all error responses (consistent across DRF):

{
  "detail": "Human-readable message in Persian",
  "error_code": "SNAKE_CASE_ERROR_CODE",
  "errors": { /* optional field-level errors from serializer */ }
}

Notes:
- "detail" is a short description suitable for displaying to users.
- "error_code" is a machine-readable code for client logic and metrics.
- "errors" should mirror DRF serializer error structure when validation fails.

---

## 2. Common error codes observed / recommended
- AUTH_REQUIRED — 401, when authentication is missing or token expired
- PERMISSION_DENIED — 403, insufficient permissions (seller/admin-only)
- VALIDATION_ERROR — 400, generic serializer error
- ADDRESS_REQUIRED — 400, user must select or create an address before checkout
- PAYMENT_FAILED — 402/400, gateway returned failure or verification failed
- PAYMENT_AMOUNT_MISMATCH — 400, gateway amount differs from order snapshot
- PAYMENT_ALREADY_PROCESSED — 409, payment session already verified
- CAPACITY_FULL — 409/400, no pickup/delivery capacity available for chosen slot
- COUPON_INVALID — 400, coupon code invalid or expired
- INSUFFICIENT_FUNDS — 402, wallet payment attempted with insufficient balance
- WITHDRAWAL_BLOCKED — 400/409, withdrawal not allowed due to cooldown
- ORDER_INVALID_TRANSITION — 400, attempted invalid state change
- NOT_FOUND — 404, resource not found
- RATE_LIMIT_EXCEEDED — 429, rate-limiting

---

## 3. HTTP status mapping
- 200/201 — success
- 400 — client error / validation
- 401 — authentication required
- 403 — permission denied
- 404 — not found
- 409 — conflict / resource already processed
- 422 — unprocessable entity (optional for semantic validation)
- 429 — rate limited
- 500 — server error (avoid leaking internal details)

---

## 4. Endpoint examples
1) Address required (checkout)

HTTP 400
{
  "detail": "آدرس انتخاب یا ایجاد کنید",
  "error_code": "ADDRESS_REQUIRED"
}

2) Payment verify mismatch

HTTP 400
{
  "detail": "مقدار پرداخت با ساب‌میت سفارش مطابقت ندارد",
  "error_code": "PAYMENT_AMOUNT_MISMATCH"
}

3) Wallet insufficient

HTTP 402
{
  "detail": "موجودی کیف پول کافی نیست",
  "error_code": "INSUFFICIENT_FUNDS"
}

---

## 5. Recommendations
1. Centralize error codes in a module (errors.constants) and use helpers to return the standard envelope. This ensures frontend can rely on stable codes.
2. Map all serializer and DRF exceptions to the envelope (use custom exception handler: PROJECT.excepthook -> return formatted response).
3. Localize messages in Persian, but keep error_code constants English and stable.
4. Include correlation_id in error logs and optionally in responses for support (only in non-sensitive contexts).

---

Next steps:
- Automated scan of views and serializers to extract literal messages and map them to error codes (optional task).

