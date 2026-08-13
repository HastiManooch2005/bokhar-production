# پرداخت‌ها (Payments) — مستندات تولیدی

وضعیت: تکمیل‌شده (Draft → Ready for review)

این سند جریان کامل پرداخت‌ها در Bokhar را شرح می‌دهد، از آغاز پرداخت تا تأیید، شارژ کیف پول، استرداد و برداشت.
کد مرجع: backend/wallet/* (views, services, serializers)

Base path: تمامی endpointها تحت روت `/api/` قرار دارند، بنابراین مسیر کامل‌ها به صورت `/api/payments/...` خواهند بود.

فهرست سریع:
- مرجع درگاه: ZarinPal (service_zarinpal)
- Endpoints اصلی: `initiate`, `verify`, `wallet/pay`, `wallet/charge`, `wallet/charge/verify`, `refund`, `withdraw`
- احراز هویت: نیازمند کاربر لاگین‌شده (IsAuthenticated). در پروژه از JWT در کوکی‌های HttpOnly + CSRF استفاده می‌شود (مشروح در SECURITY.md).

---

۱) توضیح خلاصهٔ جریان پرداخت سفارش (درگاه)

- فرانت‌اند payload سفارش را به POST /api/payments/initiate/ می‌فرستد.
- Backend: PaymentService.initiate_payment ایجاد یک PaymentSession می‌کند و به درگاه (ZarinPal) درخواست می‌زند.
- درصورت موفقیت، backend آدرسِ درگاه (payment_url) و authority را در پاسخ برمی‌گرداند.
- فرانت‌اند کاربر را به payment_url هدایت می‌کند.
- پس از پرداخت، کاربر به URL فراخوانِ زرین‌پال برگردانده می‌شود (callback) — این پروژه دو مسیر پشتیبانی می‌کند:
  - مسیر مستقیم درگاه → backend (GET /api/payments/verify/?Authority=...&Status=...)
  - یا در صورت پیاده‌سازی در فرانت‌اند، درگاه → فرانت‌اند → فرانت‌اند به backend برای verify فراخوانی AJAX انجام می‌دهد.
- Backend با gateway.verify_payment فراخوانی می‌کند، وضعیت PaymentSession را بروز می‌دهد و در صورت موفق، سفارش (Order) ایجاد می‌شود و اطلاعات مرجع (ref_id) ثبت می‌شود.

نکات مهم:
- Backend از snapshot قیمت (pricing_snapshot) داخل PaymentSession استفاده می‌کند تا بعد از پرداخت، سفارش را به‌صورت deterministic و idempotent بسازد.
- Idempotency: initiate_payment از idempotency_key پشتیبانی می‌کند (پارامتر اختیاری). اگر کلید ارسال شود و session مشابه موجود باشد، session موجود برگردانده می‌شود.

---

۲) Endpointها — توضیحات عملیاتی

A. POST /api/payments/initiate/
- View: PaymentInitiateView
- Auth: Requires authentication (IsAuthenticated)
- Request (body): همان ساختار OrderCreateSerializer در backend — مثال عمومی (JSON):
{
  "address_id": 123,
  "pickup_date": "2026-08-15",
  "pickup_shift": "morning",
  "delivery_date": "2026-08-16",
  "delivery_shift": "evening",
  "coupon_code": "SUMMER2026",
  "description": "",
  "cart_items": [
    { "service_item_id": 5, "quantity": 2, "pricing_tab_id": null, "material": "نخ", "size": null }
  ]
}
- Optional headers/query: Idempotency-Key (به‌عنوان header یا field) — سرویس از آن پشتیبانی می‌کند.
- Response 200 (success):
{
  "payment_url": "https://.../start/authority",
  "authority": "AUTH_...",
  "payment_uuid": "..."
}
- Error 400/403: validation errors, "سبد خرید خالی است", "Amount must be greater than zero" و غیره.

B. GET /api/payments/verify/?Authority={authority}&Status={Status}
- View: PaymentVerifyView
- Auth: IsAuthenticated
- Behavior (server-side): این endpoint verification کامل را انجام می‌دهد (PaymentService.verify_payment)
  - اگر تراکنش موفق شود: ایجاد Order (اگر هنوز ایجاد نشده)، ثبت ref_id و تبدیل PaymentSession → PAID
  - در پایان: این view به صفحهٔ نتیجهٔ فرانت‌اند ریدایرکت می‌کند (HttpResponseRedirect) با query params مانند:
    - success=true|false
    - order_id (اگر موفق)
    - ref_id (شناسه مرجع درگاه)
    - message (در صورت خطا)
- Important mismatch: فرانت‌اند (PaymentCallback.jsx) نیز با AJAX همین endpoint را فراخوانی می‌کند و انتظار JSON با res.data.success دارد؛ اما پیاده‌سازی فعلی backend روی redirect تنظیم شده. نتیجهٔ عدم تطابق: در حالت redirect، فراخوانی AJAX ممکن است HTML برگرداند یا رفتار نامشخصی ایجاد شود.
  - پیشنهاد: دو مسیر جدا تعریف شود: یک API verify JSON (مثلاً POST /api/payments/verify/confirm/ برای AJAX) و یک مسیر redirect-only که درگاه به آن ریدایرکت کند؛ یا روی backend طوری رفتار شود که وقتی درخواست از AJAX است (Accept: application/json یا X-Requested-With)، پاسخ JSON برگرداند و در غیر این صورت redirect انجام دهد.

C. POST /api/payments/wallet/pay/
- View: WalletPaymentView
- Auth: IsAuthenticated
- Body: همان ساختار OrderCreateSerializer (validated_data به WalletPaymentService.pay_with_wallet ارسال می‌شود)
- Response 201 (success):
{
  "order_id": 123,
  "payment_uuid": "..."
}
- Errors: موجودی کافی نیست، سبد خالی، اعتبارسنجی سفارش

D. POST /api/payments/wallet/charge/
- View: WalletChargeView
- Auth: IsAuthenticated
- Body: { "amount": <integer in rials> }
  - Validation: حداقل 100000، حداکثر 10000000 (مطابق WalletChargeSerializer)
- Response 200 (success):
{
  "payment_url": "https://.../start/authority",
  "authority": "AUTH_...",
  "payment_uuid": "..."
}
- Error: 400 ValidationError یا پیام‌های درگاه

E. GET /api/payments/wallet/charge/verify/?Authority=...&Status=...
- View: WalletChargeVerifyView
- Auth: IsAuthenticated
- Behavior: مشابه PaymentVerifyView اما مخصوص شارژ کیف پول؛ در نهایت redirect به صفحهٔ نتیجهٔ شارژ در فرانت‌اند (WALLET_CHARGE_RESULT_PATH).
- Response: redirect با پارامترهای success=true/false و message/ref_id در query

F. POST /api/payments/refund/
- View: RefundOrderView
- Auth: IsAuthenticated
- Body (example):
{
  "order": 123,
  "amount": 50000,
  "destination": "wallet" | "bank",
  "reason": "..."
}
- Behavior:
  - Serializer validate می‌کند که سفارش در وضعیت PAID باشد و مبلغ معتبر باشد و درخواست تکراری در حال پردازش نباشد.
  - اگر destination == "wallet"، بلافاصله مبلغ به کیف پول بازگردانده می‌شود (WalletPaymentService._refund_to_wallet) و refund request علامت‌گذاری می‌شود.
  - اگر destination == "bank"، یک درخواست برداشت/استرداد ایجاد می‌شود تا ادمین آن را پردازش کند.
- Response 200:
{
  "detail": "وجه با موفقیت به کیف پول شما واریز شد.",
  "refund_id": "<uuid>",
  "destination": "wallet"
}

G. POST /api/refund/process/  (admin)
- View: RefundProcessAPIView
- Auth: IsAdminUser
- Body: { "uuid": "<refund-uuid>" }
- Behavior: اجرا کنندهٔ پردازش استرداد از کلاس RefundService (قسمت admin/calls)

H. POST /api/payments/wallet/withdraw/
- View: WithdrawalRequestView
- Auth: IsAuthenticated
- Body: { "amount": <int>, "iban": "IR...", "account_holder": "..." }
- Response 200:
{
  "success": true,
  "withdrawal_id": "<uuid>",
  "message": "درخواست برداشت ثبت شد و در صف پردازش قرار گرفت."
}
- Validations: حداقل مبلغ 100000، IBAN معتبر، موجودی کافی، cooldown/lock کشیده می‌شود (قفل برداشت ۳ ساعت پس از هر تغییر موجودی)

---

۳) خطاهای رایج و کدهای پیشنهادی (نمونه‌ها)

- INVALID_REQUEST (400): خطاهای اعتبارسنجی serializers
  مثال:
  {"address": ["این فیلد لازم است."]}

- PAYMENT_SESSION_EXPIRED (400): "Payment session expired."
- PAYMENT_NOT_FOUND (404): "تراکنش یافت نشد."
- PAYMENT_OWNERSHIP_MISMATCH (403): "این تراکنش متعلق به شما نیست."
- GATEWAY_ERROR (502): خطاهای خارجی در درگاه (connection/timeout)
- WALLET_INSUFFICIENT (400): "موجودی کیف پول کافی نیست"
- REFUND_EXISTS (400): "یک درخواست استرداد در حال پردازش برای این سفارش وجود دارد."
- IBAN_INVALID (400): "شماره شبا نامعتبر است"

(بخش ERROR CODES با نمونه‌های دقیق‌تر و mapping وضعیت HTTP در فایل ERRORS.md کامل خواهد شد.)

---

۴) رفتار redirect vs AJAX — نکتهٔ عملیاتی مهم

- PaymentVerifyView و WalletChargeVerifyView در حال حاضر برای استفادهٔ مستقیم مرورگر از درگاه طراحی شده‌اند و در نهایت HttpResponseRedirect به صفحات فرانت‌اند برمی‌گردانند.
- اما فرانت‌اند فعلی (PaymentCallback.jsx) نیز پس از بازگشت از درگاه، خودش یک درخواست AJAX به `/payments/verify/` می‌زند و منتظر JSON است.
- این عدم هماهنگی ممکن است باعث شکست تأیید در سناریوهایی شود که backend یک redirect می‌فرستد.

توصیه‌ها:
- کم‌هزینه‌ترین رفع: در PaymentVerifyView اگر درخواست با header `Accept: application/json` یا `X-Requested-With: XMLHttpRequest` باشد، پاسخ JSON برگردانده شود؛ در غیر این صورت redirect انجام شود.
- جایگزین ساختارمند: معرفی یک مسیر API JSON جداگانه برای verify (مثلاً `POST /api/payments/verify/confirm/`) که فرانت‌اند آن را صدا می‌زند و backend نیز مسیر redirect مخصوص درگاه را همان‌طور که هست نگه می‌دارد.

---

۵) Idempotency و ایمنی زمانی (concurrency)

- `initiate_payment` از idempotency_key پشتیبانی می‌کند: ارسال همان idempotency_key در بازه ۲۴ ساعته باعث استفاده از همان PaymentSession می‌شود.
- `verify_payment` از DistributedLock و advisory locks (Postgres pg_advisory_xact_lock) استفاده می‌کند تا از double-processing جلوگیری شود.
- توصیه: frontend و کلیه سرویس‌های ثانویه (در صورت وجود) می‌توانند header `Idempotency-Key` را برای عملیات حساس ارسال کنند.

---

۶) نکات امنیتی و عملیاتی

- همه endpointهای حساس نیاز به احراز هویت (IsAuthenticated) دارند. session/token transport در پروژه با Cookie (HttpOnly) + CSRF ترکیب شده است. اطمینان حاصل کنید:
  - Cookie domain/path با دامنهٔ درگاه و callback سازگار باشد تا هنگام redirect کوکی‌ها همراه درخواست ارسال شوند.
  - Csrf token در فراخوانی‌های AJAX گنجانده شود (فرانت‌اند از csrftoken cookie استفاده می‌کند و header `X-CSRFToken` می‌فرستد).
- Gateway callback باید توسط IPs یا signature معتبر نیز قابل اعتبارسنجی باشد (بستگی به پشتیبانی درگاه دارد). در این پروژه ZarinPal با استفاده از verify API و بررسی ref_id/amount اعتبارسنجی می‌شود.

---

۷) نقشهٔ تماس فرانت‌اند (نمونه)

- Order.jsx: POST `${API_URL}/payments/initiate/` با payload سفارش → انتظار `payment_url` → window.location.href = payment_url
- PaymentCallback.jsx: بعد از بازگشت از درگاه (frontend route) → api.get('/payments/verify/', { params: { Authority, Status }}) و انتظار JSON { success: true, order_id }
- اگر backend redirect کند، باید PaymentCallback به جای انتظار JSON ، وضعیت redirect را مدیریت کند یا backend باید JSON را زمانی که درخواست از AJAX است برگرداند.

---

۸) Next steps (عملیاتی)

1. به‌روزرسانی PAYMENTS.md: این فایل را بررسی و تائید کن تا جزئیات بیشتر (نمونه پاسخ خطاها، کدهای خطا کامل) اضافه شود.
2. هماهنگ‌سازی رفتار verify بین فرانت‌اند و backend (see recommendations).
3. اضافه کردن تست‌های انتها-به-انتها برای جریان درگاه (initiate → callback → verify → order created).
4. مستندسازی environment variables مربوط به ZARINPAL در README یا settings (MERCHANT_ID, REQUEST_URL, VERIFY_URL, PAYMENT_URL, CALLBACK_URL, ACCESS_TOKEN).

---

فایل مرجع‌های کد: 
- backend/wallet/views/views.py
- backend/wallet/serializers/serializers.py
- backend/wallet/services/services_payment.py
- backend/wallet/services/service_zarinpal.py
- frontend: Bokhar-Frontend/src/pages/Order.jsx
- frontend: Bokhar-Frontend/src/components/orders/PaymentCallback.jsx

