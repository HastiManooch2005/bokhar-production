import logging

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.order.models import Order, OrderStatus
from wallet.serializers import (
    PaymentCreateSerializer,
    PaymentVerifySerializer,
    RefundRequestSerializer,
    WalletChargeSerializer,
    WithdrawalRequestSerializer,
)
from wallet.services.payment_service import PaymentService
from wallet.services.wallet_service import WalletPaymentService
from wallet.services.zarinpal_service import ZarinPalService

logger = logging.getLogger(__name__)


def _make_service():
    """یک نمونه از ZarinPalService می‌سازد — یک‌جا تعریف شده."""
    return ZarinPalService()


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
            validated_data=serializer.validated_data,
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
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PaymentVerifySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        authority = serializer.validated_data["Authority"]
        pay_status = serializer.validated_data["Status"]

        # اگه کاربر لغو کرد
        if pay_status != "OK":
            return Response(
                {"success": False, "message": "پرداخت توسط کاربر لغو شد."},
                status=status.HTTP_200_OK,
            )

        service = PaymentService(zarinpal_client=_make_service())
        result = service.verify_payment(
            authority=authority,
            callback_payload=dict(request.query_params),
        )
        return Response(result, status=status.HTTP_200_OK)


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
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = PaymentVerifySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        authority = serializer.validated_data["Authority"]
        pay_status = serializer.validated_data["Status"]

        service = WalletPaymentService(gateway=_make_service())
        result = service.verify_wallet_charge(
            user=request.user,
            authority=authority,
            status=pay_status,
            callback_payload=dict(request.query_params),
        )
        return Response(result, status=status.HTTP_200_OK)


# =========================================================
# 6. استرداد سفارش (به کیف پول)
# =========================================================
class RefundOrderView(APIView):
    """
    POST /api/payments/refund/
    body: { "order": <id>, "amount": ..., "destination": "wallet|bank", "reason": "..." }

    destination=wallet → فوری به کیف پول واریز می‌شود
    destination=bank   → درخواست ثبت می‌شود، ادمین پردازش می‌کند
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RefundRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order       = serializer.validated_data["order"]
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
            destination=destination,
            reason=reason,
        )

        message = (
            "وجه با موفقیت به کیف پول شما واریز شد."
            if destination == "wallet"
            else "درخواست استرداد به حساب بانکی ثبت شد و در صف پردازش قرار گرفت."
        )
        return Response({"detail": message, **result}, status=status.HTTP_200_OK)

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