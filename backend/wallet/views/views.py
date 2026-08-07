import logging
from urllib.parse import urlencode

from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from order.models import Order, OrderStatus
from wallet.serializers.serializers import (
    PaymentCreateSerializer,
    PaymentVerifySerializer,
    RefundRequestSerializer,
    WalletChargeSerializer,
    WithdrawalRequestSerializer,
)
from ..services.services_payment import PaymentService
from ..services.services_wallet import WalletPaymentService
from ..services.service_zarinpal import ZarinPalService
from decouple import config

logger = logging.getLogger(__name__)


def _make_service():
    """یک نمونه از ZarinPalService می‌سازد — یک‌جا تعریف شده."""
    return ZarinPalService()


FRONTEND_URL = config(
    "FRONTEND_URL",
    default="http://localhost:5173"
)

# FIX: مسیرهای صفحه‌ی نتیجه‌ی پرداخت روی فرانت‌اند. من مسیرهای زیر رو به عنوان
# فرض منطقی گذاشتم (چون در کد اصلی هیچ‌جا استفاده نشده بودن و مسیر واقعی رو
# نمی‌دونم) — اگر مسیر صفحه‌ی نتیجه در فرانت‌اندت فرق داره، فقط همین دو خط رو
# عوض کن؛ بقیه‌ی منطق کار می‌کنه.
ORDER_RESULT_PATH = "/order/result"
WALLET_CHARGE_RESULT_PATH = "/wallet/result"


def _redirect_with_params(base_path: str, **params) -> HttpResponseRedirect:
    """
    ریدایرکت به صفحه‌ی نتیجه در فرانت‌اند با query params.
    مقادیر None حذف می‌شن تا در URL چیزی مثل amount=None ظاهر نشه.
    """
    clean_params = {k: v for k, v in params.items() if v is not None}
    query_string = urlencode(clean_params)
    url = f"{FRONTEND_URL}{base_path}"
    if query_string:
        url = f"{url}?{query_string}"
    return HttpResponseRedirect(url)


# =========================================================
# 1. پرداخت سفارش از درگاه — initiate
# =========================================================

class PaymentInitiateView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = PaymentService(zarinpal_client=_make_service())
        result = service.initiate_payment(
            user=request.user,
            # FIX: قبلاً اینجا serializer.validated_data پاس داده می‌شد که چون
            # PaymentCreateSerializer هیچ فیلدی نداره همیشه {} بود — یعنی داده‌ی
            # واقعی سفارش (آدرس، آیتم‌ها، زمان تحویل و ...) که فرانت‌اند در
            # request.data می‌فرسته، هیچ‌وقت به OrderCreateSerializer داخل
            # PaymentService نمی‌رسید و initiate_payment همیشه با سبد خالی
            # fail می‌شد. حالا request.data واقعی پاس داده می‌شه.
            validated_data=request.data,
            request=request,
        )
        return Response(result, status=status.HTTP_200_OK)


# =========================================================
# 2. تأیید پرداخت سفارش — verify (callback زرین‌پال)
# =========================================================

class PaymentVerifyView(APIView):
    """
    GET /api/payments/verify/?Authority=xxx&Status=OK
    زرین‌پال کاربر را اینجا redirect می‌کند.

    این endpoint مستقیماً توسط مرورگر کاربر (نه AJAX فرانت‌اند) صدا زده
    می‌شود، پس همیشه باید با یک ریدایرکت به صفحه‌ی نتیجه‌ی فرانت‌اند پاسخ
    بدهد، نه یک پاسخ JSON خام.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PaymentVerifySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        authority = serializer.validated_data["Authority"]
        pay_status = serializer.validated_data["Status"]

        # اگه کاربر لغو کرد
        if pay_status != "OK":
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message="پرداخت توسط کاربر لغو شد.",
            )

        service = PaymentService(zarinpal_client=_make_service())

        # FIX: قبلاً نتیجه یا خطای این متد به صورت Response JSON خام برگردونده
        # می‌شد که در مرورگر کاربر (بعد از redirect زرین‌پال) به جای صفحه‌ی
        # نتیجه‌ی سفارش، یه صفحه‌ی JSON خالی نمایش داده می‌شد. حالا در همه‌ی
        # حالت‌ها (موفق/خطا) به صفحه‌ی نتیجه‌ی فرانت‌اند ریدایرکت می‌شه.
        try:
            result = service.verify_payment(
                authority=authority,
                user=request.user,
                callback_payload={
                    "query": dict(
                        request.query_params
                    ),
                    "ip": request.META.get(
                        "REMOTE_ADDR"
                    ),
                    "user_agent": request.META.get(
                        "HTTP_USER_AGENT"
                    ),
                },
            )
        except (ValidationError, PermissionDenied) as exc:
            detail = exc.detail
            message = str(detail[0]) if isinstance(detail, list) and detail else str(detail)
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message=message,
            )
        except Exception:
            logger.exception(
                "Unexpected error during payment verification",
                extra={"authority": authority, "user_id": request.user.id},
            )
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message="خطای غیرمنتظره در تأیید پرداخت.",
            )

        if result.get("success"):
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="true",
                order_id=result.get("order_id"),
                ref_id=result.get("ref_id"),
            )

        return _redirect_with_params(
            ORDER_RESULT_PATH,
            success="false",
            message=result.get("error", "پرداخت ناموفق بود."),
        )


# =========================================================
# 3. پرداخت سفارش از کیف پول
# =========================================================

class WalletPaymentView(APIView):
    """
    POST /api/payments/wallet/pay/
    موجودی کیف پول کسر می‌شود و سفارش ساخته می‌شود.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service = WalletPaymentService()
        result = service.pay_with_wallet(
            user=request.user,
            validated_data=request.data,
            request=request,
        )
        return Response(result, status=status.HTTP_201_CREATED)


# =========================================================
# 4. شارژ کیف پول — initiate
# =========================================================

class WalletChargeView(APIView):
    """
    POST /api/payments/wallet/charge/
    درخواست شارژ کیف پول از درگاه زرین‌پال.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WalletChargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = WalletPaymentService(gateway=_make_service())
        result = service.initiate_wallet_charge(
            user=request.user,
            amount=serializer.validated_data["amount"],
        )
        return Response(result, status=status.HTTP_200_OK)


# =========================================================
# 5. تأیید شارژ کیف پول — verify (callback زرین‌پال)
# =========================================================

class WalletChargeVerifyView(APIView):
    """
    GET /api/payments/wallet/charge/verify/?Authority=xxx&Status=OK
    زرین‌پال کاربر را بعد از شارژ اینجا redirect می‌کند.

    مثل PaymentVerifyView، این endpoint مستقیماً توسط مرورگر کاربر صدا زده
    می‌شود، پس همیشه به صفحه‌ی نتیجه‌ی فرانت‌اند ریدایرکت می‌کند.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PaymentVerifySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        authority = serializer.validated_data["Authority"]
        pay_status = serializer.validated_data["Status"]

        service = WalletPaymentService(gateway=_make_service())

        # FIX: همون مشکل PaymentVerifyView — قبلاً JSON خام برمی‌گشت، حالا
        # به صفحه‌ی نتیجه‌ی شارژ کیف پول در فرانت‌اند ریدایرکت می‌شه.
        try:
            result = service.verify_wallet_charge(
                user=request.user,
                authority=authority,
                status=pay_status,
                callback_payload=dict(request.query_params),
            )
        except (ValidationError, PermissionDenied) as exc:
            detail = exc.detail
            message = str(detail[0]) if isinstance(detail, list) and detail else str(detail)
            return _redirect_with_params(
                WALLET_CHARGE_RESULT_PATH,
                success="false",
                message=message,
            )
        except Exception:
            logger.exception(
                "Unexpected error during wallet charge verification",
                extra={"authority": authority, "user_id": request.user.id},
            )
            return _redirect_with_params(
                WALLET_CHARGE_RESULT_PATH,
                success="false",
                message="خطای غیرمنتظره در تأیید شارژ کیف پول.",
            )

        if result.get("success"):
            return _redirect_with_params(
                WALLET_CHARGE_RESULT_PATH,
                success="true",
            )

        return _redirect_with_params(
            WALLET_CHARGE_RESULT_PATH,
            success="false",
            message=result.get("error", "شارژ کیف پول ناموفق بود."),
        )


# =========================================================
# 6. استرداد سفارش (به کیف پول)
# =========================================================

class RefundOrderView(APIView):
    """
    POST /api/payments/refund/
    body: { "order": , "amount": ..., "destination": "wallet|bank", "reason": "..." }

    destination=wallet → فوری به کیف پول واریز می‌شود
    destination=bank   → درخواست ثبت می‌شود، ادمین پردازش می‌کند
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RefundRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order       = serializer.validated_data["order"]
        # FIX: amount در سریالایزر validate می‌شد (چک می‌شد که از final_price
        # سفارش بیشتر نباشه) ولی قبلاً هیچ‌وقت به service.refund_order() پاس
        # داده نمی‌شد. توجه: این خط فرض می‌کنه امضای WalletPaymentService.refund_order
        # آرگومان amount را می‌پذیرد — چون کد آن سرویس در اختیارم نبود نتونستم
        # این فرض رو تأیید کنم؛ اگر امضای واقعی فرق داره (مثلاً اسم پارامتر
        # چیز دیگه‌ایه)، همین یک خط رو مطابق آن اصلاح کن.
        amount      = serializer.validated_data["amount"]
        destination = serializer.validated_data["destination"]
        reason      = serializer.validated_data.get("reason", "")

        # مطمئن میشیم سفارش متعلق به همین کاربر است
        if order.user != request.user:
            return Response(
                {"detail": "این سفارش متعلق به شما نیست."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = WalletPaymentService(gateway=_make_service())
        result = service.refund_order(
            order=order,
            amount=amount,
            destination=destination,
            reason=reason,
        )

        message = (
            "وجه با موفقیت به کیف پول شما واریز شد."
            if destination == "wallet"
            else "درخواست استرداد به حساب بانکی ثبت شد و در صف پردازش قرار گرفت."
        )
        return Response({"detail": message, **result}, status=status.HTTP_200_OK)


# =========================================================
# Refund Process (Admin) — دست‌نخورده، هنوز نیاز به بررسی بیشتر دارد
# =========================================================
# NOTE: طبق بحث قبلی، این ویو با RefundService ناسازگاره (امضای __init__
# نیاز به terminal داره و متد process_refund اصلاً روی RefundService وجود
# نداره). قصداً همون کد اصلی رو نگه داشتم تا وقتی اطلاعات کامل (مدل/کلاس
# terminal و GraphQLClient) رو بفرستی، جدا اصلاحش کنیم.

from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from ..serializers.serializers import *

from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from ..serializers.serializers import RefundProcessSerializer
from ..services.refund import *


class RefundProcessAPIView(APIView):

    permission_classes = [IsAdminUser]

    def post(self, request):

        serializer = RefundProcessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refund = serializer.context["refund"]

        try:

            result = RefundService().process_refund(
                refund_id=refund.id,
            )

            return Response(
                result,
                status=status.HTTP_200_OK,
            )

        except ValidationError as exc:

            return Response(
                {
                    "success": False,
                    "error": str(exc.detail),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as exc:

            return Response(
                {
                    "success": False,
                    "error": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# =========================================================
# 7. برداشت از کیف پول به حساب بانکی
# =========================================================

class WithdrawalRequestView(APIView):
    """
    POST /api/payments/wallet/withdraw/
    body: { "amount": ..., "iban": "IR...", "account_holder": "..." }
    درخواست ثبت می‌شود و ادمین/Celery task پردازش می‌کند.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = WithdrawalRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = PaymentService(zarinpal_client=_make_service())
        result = service.withdraw_to_bank(
            user=request.user,
            amount=serializer.validated_data["amount"],
            iban=serializer.validated_data["iban"],
            account_holder=serializer.validated_data["account_holder"],
        )
        return Response(result, status=status.HTTP_200_OK)