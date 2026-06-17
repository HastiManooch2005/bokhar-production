import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ZarinPalService:
    """
    سرویس ارتباط با زرین‌پال

    متدها:
        request_payment  → درخواست پرداخت، دریافت authority
        verify_payment   → تأیید پرداخت بعد از redirect کاربر
        request_refund   → استرداد وجه به کارت/شبا (نیاز به ACCESS_TOKEN)

    نکته: زرین‌پال API عمومی برای انتقال به حساب (پایا) ندارد.
    برداشت از کیف پول داخل اپ (WithdrawalRequest) باید
    توسط ادمین از پنل زرین‌پال انجام شود.
    """

    def __init__(self):
        zp = settings.ZARINPAL
        self.merchant_id  = zp["MERCHANT_ID"]
        self.request_url  = zp["REQUEST_URL"]
        self.verify_url   = zp["VERIFY_URL"]
        self.payment_url  = zp["PAYMENT_URL"]
        self.callback_url = zp["CALLBACK_URL"]
        self.refund_url   = zp.get(
            "REFUND_URL",
            "https://api.zarinpal.com/pg/v4/payment/refund.json",
        )
        # فقط برای refund لازم است
        self.access_token = zp.get("ACCESS_TOKEN")

    # ------------------------------------------------------------------
    # PRIVATE
    # ------------------------------------------------------------------
    def _extract_error(self, result: dict, default: str = "خطای ناشناخته") -> dict:
        """
        زرین‌پال errors را هم به صورت dict و هم list برمی‌گرداند.
        این متد هر دو حالت را handle می‌کند.
        """
        errors = result.get("errors", {})
        if isinstance(errors, list) and errors:
            return {"message": errors[0].get("message", default), "code": errors[0].get("code", -1)}
        if isinstance(errors, dict) and errors:
            return {"message": errors.get("message", default), "code": errors.get("code", -1)}
        return {"message": default, "code": -1}

    def _post(self, url: str, payload: dict, headers: dict = None) -> tuple[bool, dict]:
        """
        wrapper مشترک برای همه درخواست‌های POST.
        برمی‌گرداند: (ok: bool, data: dict)
        """
        _headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if headers:
            _headers.update(headers)
        try:
            resp = requests.post(url, json=payload, headers=_headers, timeout=30)
        except requests.exceptions.Timeout:
            return False, {"message": "وقفه در ارتباط با درگاه", "code": -1}
        except requests.exceptions.ConnectionError:
            return False, {"message": "عدم اتصال به درگاه", "code": -2}
        except Exception as e:
            logger.exception(f"Unexpected HTTP error: {e}")
            return False, {"message": "خطای غیرمنتظره", "code": -3}

        if resp.status_code != 200:
            logger.error(f"HTTP {resp.status_code} from ZarinPal — url={url}")
            return False, {"message": f"خطای سرور (HTTP {resp.status_code})", "code": resp.status_code}

        try:
            return True, resp.json()
        except ValueError:
            return False, {"message": "پاسخ نامعتبر از سرور", "code": -4}

    # ------------------------------------------------------------------
    # PUBLIC
    # ------------------------------------------------------------------
    def request_payment(self, amount: int, description: str, mobile: str = None) -> dict:
        """
        مرحله اول پرداخت: دریافت authority و لینک درگاه.

        :param amount:      مبلغ به ریال
        :param description: توضیح تراکنش
        :param mobile:      شماره موبایل (اختیاری، برای pre-fill در درگاه)
        :return:
            موفق  → {"success": True,  "authority": "...", "payment_url": "..."}
            خطا   → {"success": False, "error": "...",     "code": ...}
        """
        payload = {
            "merchant_id":  self.merchant_id,
            "amount":        amount,
            "description":   description,
            "callback_url":  self.callback_url,
        }
        if mobile:
            payload["mobile"] = mobile

        ok, result = self._post(self.request_url, payload)
        if not ok:
            return {"success": False, "error": result["message"], "code": result["code"]}

        authority = result.get("data", {}).get("authority")
        if authority:
            logger.info(f"ZarinPal request OK — authority={authority} amount={amount}")
            return {
                "success":     True,
                "authority":   authority,
                "payment_url": f"{self.payment_url}{authority}",
            }

        error = self._extract_error(result)
        logger.error(f"ZarinPal request failed — code={error['code']} msg={error['message']}")
        return {"success": False, "error": error["message"], "code": error["code"]}

    # ------------------------------------------------------------------
    def verify_payment(self, authority: str, amount: int) -> dict:
        """
        مرحله دوم: تأیید پرداخت بعد از بازگشت کاربر از درگاه.

        کد ۱۰۰ = پرداخت موفق
        کد ۱۰۱ = قبلاً تأیید شده (idempotent، باز هم موفق حساب می‌شود)

        :return:
            موفق  → {"success": True, "ref_id": "...", "already_verified": bool}
            خطا   → {"success": False, "error": "...", "code": ...}
        """
        payload = {
            "merchant_id": self.merchant_id,
            "amount":       amount,
            "authority":    authority,
        }

        ok, result = self._post(self.verify_url, payload)
        if not ok:
            return {"success": False, "error": result["message"], "code": result["code"]}

        data = result.get("data", {})
        code = data.get("code")

        if code in (100, 101):
            already = (code == 101)
            logger.info(f"ZarinPal verify OK — ref_id={data.get('ref_id')} already_verified={already}")
            return {
                "success":          True,
                "ref_id":           str(data.get("ref_id", "")),
                "card_pan":         data.get("card_pan", ""),
                "already_verified": already,
            }

        error = self._extract_error(result, "تأیید پرداخت ناموفق")
        logger.error(f"ZarinPal verify failed — code={error['code']} msg={error['message']}")
        return {"success": False, "error": error["message"], "code": error["code"]}

    # ------------------------------------------------------------------
    def request_refund(self, session_id: str, amount: int, description: str = "CUSTOMER_REQUEST") -> dict:
        """
        استرداد وجه به روش زرین‌پال (برگشت به کارت بانکی اصلی).
        نیاز به ACCESS_TOKEN دارد (از پنل زرین‌پال بگیرید).

        ⚠️  این متد فقط برای RefundRequest با destination=bank استفاده می‌شود.
            برای destination=wallet، موجودی کیف پول داخل اپ شارژ می‌شود
            و نیازی به فراخوانی زرین‌پال نیست.

        :param session_id:  شناسه session پرداخت در زرین‌پال
        :param amount:      مبلغ به ریال
        :param description: دلیل استرداد
        :return:
            موفق  → {"success": True, "refund_id": "..."}
            خطا   → {"success": False, "error": "...", "code": ...}
        """
        if not self.access_token:
            logger.error("ZarinPal ACCESS_TOKEN is not configured")
            return {"success": False, "error": "تنظیمات استرداد ناقص است (ACCESS_TOKEN)", "code": -412}

        if not session_id:
            return {"success": False, "error": "session_id الزامی است", "code": -410}

        if amount <= 0:
            return {"success": False, "error": "مبلغ استرداد نامعتبر است", "code": -411}

        payload = {
            "session_id":  session_id,
            "amount":       amount,
            "description":  description,
        }
        headers = {"Authorization": f"Bearer {self.access_token}"}

        ok, result = self._post(self.refund_url, payload, headers)
        if not ok:
            return {"success": False, "error": result["message"], "code": result["code"]}

        data = result.get("data")
        if data:
            refund_id = data.get("id") or data.get("refund_id") or data.get("reference_id")
            logger.info(f"ZarinPal refund OK — refund_id={refund_id} amount={amount}")
            return {"success": True, "refund_id": refund_id}

        error = self._extract_error(result, "استرداد وجه ناموفق")
        logger.error(f"ZarinPal refund failed — code={error['code']} msg={error['message']}")
        return {"success": False, "error": error["message"], "code": error["code"]}