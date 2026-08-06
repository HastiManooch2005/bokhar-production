import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _mask_authority(authority: str) -> str:
    """Mask authority for safe logging."""
    if not authority or not isinstance(authority, str):
        return "<invalid>"
    if len(authority) <= 8:
        return authority[:4] + "****"
    return authority[:8] + "..."


def _mask_card_pan(card_pan: str) -> str:
    """Mask card PAN for safe logging."""
    if not card_pan or not isinstance(card_pan, str):
        return "<invalid>"
    if len(card_pan) <= 4:
        return "****"
    return "****" + card_pan[-4:]


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
        self.graphql_url = zp.get(
            "GRAPHQL_URL",
            "https://next.zarinpal.com/api/v4/graphql",
        )
        self.access_token = zp.get("ACCESS_TOKEN")

    def _graphql(self, query: str, variables: dict) -> tuple[bool, dict]:
        """
        ارسال Query یا Mutation به GraphQL زرین پال
        """

        if not self.access_token:
            return False, {
                "message": "ACCESS_TOKEN تنظیم نشده است",
                "code": -401,
            }

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

        payload = {
            "query": query,
            "variables": variables,
        }

        ok, result = self._post(
            self.graphql_url,
            payload,
            headers=headers,
        )
        if not ok:
            return ok, result

        data = result.get("data")
        if not isinstance(data, dict):
            return False, {
                "message": "پاسخ GraphQL فاقد داده معتبر است",
                "code": -23,
            }

        return True, result

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
            code = errors[0].get("code")
            if code is None:
                code = -1
            return {"message": errors[0].get("message", default), "code": code}
        if isinstance(errors, dict) and errors:
            code = errors.get("code")
            if code is None:
                code = -1
            return {"message": errors.get("message", default), "code": code}
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
            logger.exception("Unexpected HTTP error", extra={"error_type": type(e).__name__})
            return False, {"message": "خطای غیرمنتظره", "code": -3}

        if resp.status_code != 200:
            logger.error(
                "HTTP error from ZarinPal",
                extra={
                    "http_status": resp.status_code,
                    "url_endpoint": url,
                }
            )
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

        data = result.get("data", {})
        if not isinstance(data, dict):
            logger.error(
                "ZarinPal request failed: invalid data structure",
                extra={"response_type": type(data).__name__}
            )
            return {"success": False, "error": "پاسخ نامعتبر از سرور", "code": -4}

        authority = data.get("authority")
        if authority:
            logger.info(
                "ZarinPal payment request created",
                extra={"authority_prefix": _mask_authority(authority)}
            )
            return {
                "success":     True,
                "authority":   authority,
                "payment_url": f"{self.payment_url}{authority}",
            }

        error = self._extract_error(result)
        logger.error(
            "ZarinPal request failed",
            extra={
                "code": error["code"]
            }
        )
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
        if authority is None or not isinstance(authority, str) or authority.strip() == "":
            logger.warning(
                "verify_payment called with invalid authority",
                extra={
                    "authority_type": type(authority).__name__ if authority is not None else "None",
                }
            )
            return {
                "success": False,
                "error": "authority نامعتبر است",
                "code": -12,
            }

        payload = {
            "merchant_id": self.merchant_id,
            "amount":       amount,
            "authority":    authority,
        }

        ok, result = self._post(self.verify_url, payload)
        if not ok:
            return {"success": False, "error": result["message"], "code": result["code"]}

        data = result.get("data", {})
        if not isinstance(data, dict):
            logger.error(
                "ZarinPal verify failed: invalid data structure",
                extra={
                    "authority_prefix": _mask_authority(authority),
                    "response_type": type(data).__name__,
                }
            )
            return {"success": False, "error": "پاسخ نامعتبر از سرور", "code": -4}

        code = data.get("code")

        if code in (100, 101):
            ref_id = data.get("ref_id")
            if ref_id is None or (isinstance(ref_id, str) and ref_id.strip() == "") or ref_id == "":
                logger.error(
                    "ZarinPal verify succeeded but ref_id is missing",
                    extra={
                        "authority_prefix": _mask_authority(authority),
                        "verify_code": code,
                    }
                )
                return {
                    "success": False,
                    "error": "تراکنش تایید شد اما ref_id دریافت نشد",
                    "code": -13,
                }

            already = (code == 101)
            card_pan = data.get("card_pan", "")
            logger.info(
                "ZarinPal payment verified",
                extra={
                    "already_verified": already,
                    "authority_prefix": _mask_authority(authority),
                    "card_pan_masked": _mask_card_pan(card_pan),
                }
            )
            return {
                "success":          True,
                "ref_id":           str(ref_id),
                "card_pan":         card_pan,
                "already_verified": already,
            }

        error = self._extract_error(result, "تأیید پرداخت ناموفق")
        logger.error(
            "ZarinPal verify failed",
            extra={
                "code": error["code"],
                "authority_prefix": _mask_authority(authority),
            }
        )
        return {"success": False, "error": error["message"], "code": error["code"]}