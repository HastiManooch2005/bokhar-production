import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from order.models import Order, OrderStatus

from ..models.models import (
    PaymentSession,
    RefundRequest,
    Wallet,
    WalletTransaction,
)

from ..models.setting_payment_models import PaymentTerminal
from .service_refund import RefundService



logger = logging.getLogger(__name__)


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


    def _get_terminal(self):

        terminal = (
            PaymentTerminal.objects
            .filter(is_active=True)
            .first()
        )

        if not terminal:
            raise ValidationError(
                "ترمینال فعال زرین پال پیدا نشد."
            )

        return terminal


    def process_refund(
        self,
        refund_id: int,
        method="PAYA",
        reason="CUSTOMER_REQUEST",
    ):

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
                    "Refund request is not approved."
                )


            if refund.amount < self.MIN_REFUND_AMOUNT:
                raise ValidationError(
                    "Refund amount is below minimum."
                )


            if method not in self.VALID_METHODS:
                raise ValidationError(
                    "Invalid refund method."
                )


            if reason not in self.VALID_REASONS:
                raise ValidationError(
                    "Invalid refund reason."
                )


            payment = refund.payment


            if not payment.session_id:
                raise ValidationError(
                    "Payment session id not found."
                )


            refund.status = RefundRequest.Status.PROCESSING
            refund.processed_at = timezone.now()

            refund.save(
                update_fields=[
                    "status",
                    "processed_at",
                ]
            )


            wallet, _ = Wallet.objects.get_or_create(
                user=refund.user,
                defaults={
                    "is_active": True
                }
            )


            wallet_transaction = (
                WalletTransaction.objects.create(
                    wallet=wallet,
                    refund=refund,
                    payment_session=payment,
                    order=refund.order,
                    amount=refund.amount,
                    transaction_type=
                    WalletTransaction.Type.REFUND,
                    status=
                    WalletTransaction.Status.PENDING,
                    description=
                    f"Refund Order #{refund.order.id}",
                )
            )


        terminal = self._get_terminal()

        service = RefundService(
            terminal=terminal
        )


        result = service.request_refund(
            session_id=payment.session_id,
            amount=refund.amount,
            description=f"Refund Order #{refund.order.id}",
            method=method,
            reason=reason,
        )


        with transaction.atomic():

            refund = (
                RefundRequest.objects
                .select_for_update()
                .get(id=refund_id)
            )


            wallet_transaction = (
                WalletTransaction.objects
                .select_for_update()
                .get(
                    refund=refund
                )
            )


            refund.external_refund_id = (
                result.get("refund_id")
            )

            refund.terminal_id = (
                result.get("terminal_id")
            )


            status = result.get(
                "refund_status"
            )


            if status == "SUCCESS":

                refund.status = (
                    RefundRequest.Status.COMPLETED
                )

                refund.completed_at = timezone.now()


                refund.payment.status = (
                    PaymentSession.Status.REFUNDED
                )

                refund.payment.refunded_at = (
                    timezone.now()
                )


                wallet_transaction.status = (
                    WalletTransaction.Status.SUCCESS
                )


                refund.payment.save(
                    update_fields=[
                        "status",
                        "refunded_at",
                    ]
                )


            elif status == "PENDING":

                refund.status = (
                    RefundRequest.Status.PROCESSING
                )


            else:

                refund.status = (
                    RefundRequest.Status.FAILED
                )

                wallet_transaction.status = (
                    WalletTransaction.Status.FAILED
                )


                refund.fail_reason = (
                    result.get(
                        "error",
                        "Refund failed"
                    )
                )


            refund.save()

            wallet_transaction.save()


            return {
                "success": status in (
                    "SUCCESS",
                    "PENDING",
                ),
                "refund_status": status,
                "refund_id": refund.external_refund_id,
            }



    @transaction.atomic
    def refund_order(
        self,
        *,
        order: Order,
        destination: str,
        reason=""
    ):

        from ..tasks import process_refund_task
        if order.status != OrderStatus.PAID:
            raise ValidationError(
                "Only paid orders can be refunded."
            )


        payment = (
            order.payment_sessions
            .filter(
                status=PaymentSession.Status.PAID,
                is_verified=True,
            )
            .first()
        )


        if not payment:
            raise ValidationError(
                "Payment not found."
            )


        refund_request = RefundRequest.objects.create(
            user=order.user,
            order=order,
            payment=payment,
            amount=payment.amount,
            destination=destination,
            reason=reason,
            status=RefundRequest.Status.APPROVED,
        )


        if destination == RefundRequest.Destination.BANK:

            transaction.on_commit(
                lambda:
                process_refund_task.delay(
                    refund_request.id
                )
            )


        elif destination == RefundRequest.Destination.WALLET:

            raise NotImplementedError(
                "Wallet refund not implemented."
            )


        else:

            raise ValidationError(
                "Invalid destination."
            )


        return {
            "refund_request_id":
                str(refund_request.uuid),
            "status":
                refund_request.status,
        }