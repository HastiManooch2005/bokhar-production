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
from django.conf import settings

from wallet.services.services_payment import PaymentService
from wallet.services.services_wallet import WalletPaymentService
from wallet.services.service_zarinpal import ZarinPalService
from decouple import config
from ..models.models import Wallet

logger = logging.getLogger(__name__)


def _make_service():
    """یک نمونه از ZarinPalService می‌سازد — یک‌جا تعریف شده."""
    return ZarinPalService()


FRONTEND_URL = config(
    "FRONTEND_URL",
    default="http://localhost:5173"
)

ORDER_RESULT_PATH = "/#/shop"
WALLET_CHARGE_RESULT_PATH = "/#/customer-dashboard/wallet"

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


class PaymentInitiateView(APIView):
    """شروع پرداخت - دریافت لینک درگاه"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = PaymentService(zarinpal_client=ZarinPalService())
        result = service.initiate_payment(
            user=request.user,
            validated_data=request.data,
            request=request,
        )
        return Response(result, status=status.HTTP_200_OK)


# views.py
import logging
from django.http import HttpResponseRedirect
from django.utils.http import urlencode
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny  # ✅ تغییر مهم
from rest_framework.exceptions import ValidationError, PermissionDenied


@method_decorator(csrf_exempt, name='dispatch')  # ✅ غیرفعال کردن CSRF برای callback
class PaymentVerifyView(APIView):
    """
    تأیید پرداخت - CALLBACK زرین‌پال
    GET /api/payments/verify/?Authority=xxx&Status=OK

    ⚠️ توجه: این ویو بدون احراز هویت است چون زرین‌پال
    توکن احراز هویت را همراه با callback ارسال نمی‌کند.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # 1. دریافت پارامترها
        authority = request.query_params.get("Authority")
        status = request.query_params.get("Status")

        # 2. اگر کاربر لغو کرده باشد
        if status != "OK":
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message="پرداخت توسط کاربر لغو شد.",
            )

        # 3. بررسی اعتبار authority
        if not authority:
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message="کد تراکنش معتبر نیست.",
            )

        # 4. پیدا کردن payment session بدون نیاز به احراز هویت
        try:
            from ..models.models import PaymentSession  # آدرس مدل خود را تنظیم کنید

            # پیدا کردن تراکنش با authority
            payment = PaymentSession.objects.filter(authority=authority).first()
            if not payment:
                return _redirect_with_params(
                    ORDER_RESULT_PATH,
                    success="false",
                    message="تراکنش یافت نشد.",
                )

            # کاربر را از روی payment پیدا کنید (نه از request.user)
            user = payment.user

            # اگر کاربر لاگین است، مالکیت را چک کنید
            if request.user.is_authenticated and request.user.id != user.id:
                return _redirect_with_params(
                    ORDER_RESULT_PATH,
                    success="false",
                    message="این تراکنش متعلق به شما نیست.",
                )

        except Exception as exc:
            logger.exception(f"Error finding payment session: {exc}")
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message="خطا در یافتن تراکنش.",
            )

        # 5. ساخت سرویس با callback_url
        service = PaymentService(
            zarinpal_client=ZarinPalService(
     
            )
        )

        # 6. تأیید پرداخت
        try:
            result = service.verify_payment(
                authority=authority,
                user=user,  # ✅ کاربر را از payment بگیرید
                callback_payload={
                    "query": dict(request.query_params),
                    "ip": request.META.get("REMOTE_ADDR"),
                    "user_agent": request.META.get("HTTP_USER_AGENT"),
                },
            )
        except ValidationError as exc:
            detail = exc.detail
            message = str(detail[0]) if isinstance(detail, list) and detail else str(detail)
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message=message,
            )
        except PermissionDenied as exc:
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message=str(exc.detail) if hasattr(exc, 'detail') else "شما دسترسی ندارید.",
            )
        except Exception as exc:
            logger.exception(f"Unexpected error in payment verification: {exc}")
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="false",
                message="خطای غیرمنتظره در تأیید پرداخت.",
            )

        # 7. نمایش نتیجه
        if result.get("success"):
            return _redirect_with_params(
                ORDER_RESULT_PATH,
                success="true",
                order_id=result.get("order_id"),
                ref_id=result.get("ref_id"),
                message="پرداخت با موفقیت انجام شد.",
            )

        return _redirect_with_params(
            ORDER_RESULT_PATH,
            success="false",
            message=result.get("error", "پرداخت ناموفق بود."),
            code=result.get("code"),
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
    permission_classes = [AllowAny]

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

class WalletBalanceView(APIView):
    """
    GET /api/wallet/balance/
    موجودی کیف پول کاربر (ریال)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wallet, created = Wallet.objects.get_or_create(
            user=request.user,
            defaults={"available_balance": 0, "locked_balance": 0}
        )
        return Response(
            {"balance": wallet.available_balance},
            status=status.HTTP_200_OK,
        )