from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from ..models.models import *

from order.models import Order, OrderItem, OrderStatus, OrderStatusLog
from order.serializers import OrderCreateSerializer
from users.models import User
from  ..models.models import PaymentSession, Wallet, WalletTransaction, WithdrawalRequest
from ..monitoring.monitoring.metric import *
from ..utils.lock_utils import DistributedLock
from ..utils.utils import *
from .service_helper import create_audit_log
from .service_refund import *



class Refund:

    MIN_REFUND_AMOUNT = 20_000

    VALID_METHODS = (
        "CARD",
        "PAYA",
    )

    VALID_REASONS = (
        "CUSTOMER_REQUEST",
        "DUPLICATE_TRANSACTION",
        "SUSPICIOUS_TRANSACTION",
        "OTHER",
    )

    # -------------------------------------------------------
    # BANK REFUND
    # -------------------------------------------------------

    def process_refund(
            self,
            refund_id: int,
            method: str = "PAYA",
            reason: str = "CUSTOMER_REQUEST",
    ):
        """
        ارسال درخواست استرداد وجه به زرین‌پال
        """

        # -------------------------------------------------
        # Step 1 - آماده‌سازی
        # -------------------------------------------------

        with transaction.atomic():

            refund = (
                RefundRequest.objects
                .select_for_update()
                .select_related(
                    "payment",
                    "order",
                )
                .get(id=refund_id)
            )

            if refund.status != RefundRequest.Status.APPROVED:
                raise ValidationError(
                    "درخواست استرداد هنوز تأیید نشده است."
                )

            if refund.amount < self.MIN_REFUND_AMOUNT:
                raise ValidationError(
                    "حداقل مبلغ استرداد ۲۰۰۰۰ ریال است."
                )

            if method not in self.VALID_METHODS:
                raise ValidationError(
                    "روش استرداد نامعتبر است."
                )

            if reason not in self.VALID_REASONS:
                raise ValidationError(
                    "دلیل استرداد نامعتبر است."
                )

            refund.status = RefundRequest.Status.PROCESSING
            refund.processed_at = timezone.now()

            refund.save(
                update_fields=[
                    "status",
                    "processed_at",
                ]
            )

            wallet_transaction = WalletTransaction.objects.create(
                refund=refund,
                order=refund.order,
                amount=refund.amount,
                transaction_type=WalletTransaction.Type.REFUND,
                status=WalletTransaction.Status.PENDING,
                description=f"Refund Order #{refund.order_id}",
            )

        # -------------------------------------------------
        # Step 2 - Call ZarinPal API (خارج از Transaction)
        # -------------------------------------------------

        try:

            refund_service = RefundService(
                terminal=refund.payment.terminal
            )

            result = refund_service.request_refund(
                session_id=refund.payment.session_id,
                amount=refund.amount,
                description=f"Refund Order #{refund.order_id}",
                method=method,
                reason=reason,
            )

        except Exception as exc:

            result = {
                "refund_status": "FAILED",
                "error": str(exc),
            }

        # -------------------------------------------------
        # Step 3 - ذخیره نتیجه
        # -------------------------------------------------

        with transaction.atomic():

            refund = (
                RefundRequest.objects
                .select_for_update()
                .get(id=refund_id)
            )

            wallet_transaction = (
                WalletTransaction.objects
                .select_for_update()
                .get(id=wallet_transaction.id)
            )

            refund.external_refund_id = result.get("refund_id")
            refund.terminal_id = result.get("terminal_id")

            refund_status = result.get("refund_status")

            if refund_status == "SUCCESS":

                refund.status = RefundRequest.Status.COMPLETED
                refund.completed_at = timezone.now()

                wallet_transaction.status = (
                    WalletTransaction.Status.SUCCESS
                )

            elif refund_status == "PENDING":

                refund.status = RefundRequest.Status.PROCESSING

            else:

                refund.status = RefundRequest.Status.FAILED

                wallet_transaction.status = (
                    WalletTransaction.Status.FAILED
                )

                refund.fail_reason = result.get(
                    "error",
                    "Refund failed.",
                )

            refund.save()

            wallet_transaction.save()

        return {
            "success": refund_status in ("SUCCESS", "PENDING"),
            "refund_id": refund.external_refund_id,
            "terminal_id": refund.terminal_id,
            "refund_status": refund_status,
            "status": refund.status,
            "pending": refund_status == "PENDING",
        }
    # -------------------------------------------------------
    # MAIN REFUND
    # -------------------------------------------------------

    @transaction.atomic
    def refund_order(
        self,
        *,
        order: Order,
        destination: str,
        reason: str = "",
    ) -> dict:

        if order.status != OrderStatus.PAID:
            raise ValidationError(
                "فقط سفارش‌های پرداخت‌شده قابل استرداد هستند."
            )

        payment = (
            order.payment_sessions
            .filter(status=PaymentSession.Status.PAID)
            .first()
        )

        if payment is None:
            raise ValidationError(
                "هیچ پرداخت موفقی یافت نشد."
            )

        if payment.amount != order.final_price:
            raise ValidationError(
                "مبلغ پرداخت با مبلغ سفارش مطابقت ندارد."
            )

        refund_request = RefundRequest.objects.create(
            user=order.user,
            order=order,
            payment=payment,
            amount=order.final_price,
            destination=destination,
            reason=reason,
            status=RefundRequest.Status.APPROVED,
        )


        if destination == RefundRequest.Destination.BANK:

            transaction.on_commit(
                lambda: self.process_refund(
                    refund_request.id
                )
            )

        else:

            raise ValidationError(
                "مقصد استرداد نامعتبر است."
            )

        order.status = OrderStatus.RETURNED

        order.save(
            update_fields=[
                "status",
            ]
        )

        return {
            "refund_id": str(refund_request.uuid),
            "destination": destination,
        }