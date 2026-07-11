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
    # Active Terminal
    # -------------------------------------------------------

    def _get_terminal(self):

        terminal = (
            PaymentTerminal.objects
            .filter(is_active=True)
            .first()
        )

        if terminal is None:
            raise ValidationError(
                "ترمینال فعال زرین پال پیدا نشد."
            )

        return terminal

    # -------------------------------------------------------
    # BANK REFUND
    # -------------------------------------------------------

    def process_refund(
        self,
        refund_id: int,
        method: str = "PAYA",
        reason: str = "CUSTOMER_REQUEST",
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
                    "Refund amount is کمتر از حداقل مجاز."
                )

            if method not in self.VALID_METHODS:
                raise ValidationError(
                    "Invalid refund method."
                )

            if reason not in self.VALID_REASONS:
                raise ValidationError(
                    "Invalid refund reason."
                )

            if not refund.payment.session_id:
                raise ValidationError(
                    "Session ID یافت نشد."
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
                wallet=refund.user.wallet,
                refund=refund,
                payment_session=refund.payment,
                order=refund.order,
                amount=refund.amount,
                transaction_type=WalletTransaction.Type.REFUND,
                status=WalletTransaction.Status.PENDING,
                description=f"Refund Order #{refund.order.id}",
            )

        terminal = self._get_terminal()

        refund_service = RefundService(
            terminal=terminal,
        )

        try:

            result = refund_service.request_refund(
                session_id=refund.payment.session_id,
                amount=refund.amount,
                description=f"Refund Order #{refund.order.id}",
                method=method,
                reason=reason,
            )

        except Exception as exc:

            result = {
                "refund_status": "FAILED",
                "error": str(exc),
            }
            # -------------------------------------------------
            # Step 3 - Save Result
            # -------------------------------------------------

            with transaction.atomic():

                refund = (
                    RefundRequest.objects
                    .select_for_update()
                    .get(id=refund_id)
                )

                payment = (
                    PaymentSession.objects
                    .select_for_update()
                    .get(id=refund.payment_id)
                )

                wallet_transaction = (
                    WalletTransaction.objects
                    .select_for_update()
                    .get(id=wallet_transaction.id)
                )

                refund.external_refund_id = result.get("refund_id", "")
                refund.terminal_id = result.get("terminal_id", "")

                refund_status = result.get("refund_status")

                if refund_status == "SUCCESS":

                    refund.status = RefundRequest.Status.COMPLETED
                    refund.completed_at = timezone.now()

                    payment.status = PaymentSession.Status.REFUNDED
                    payment.refunded_at = timezone.now()

                    wallet_transaction.status = (
                        WalletTransaction.Status.SUCCESS
                    )

                    payment.save(
                        update_fields=[
                            "status",
                            "refunded_at",
                        ]
                    )

                elif refund_status == "PENDING":

                    refund.status = RefundRequest.Status.PROCESSING

                else:

                    refund.status = RefundRequest.Status.FAILED

                    refund.fail_reason = result.get(
                        "error",
                        "Refund failed."
                    )

                    wallet_transaction.status = (
                        WalletTransaction.Status.FAILED
                    )

                refund.save()

                wallet_transaction.save()

            return {
                "success": refund_status in (
                    "SUCCESS",
                    "PENDING",
                ),
                "pending": refund_status == "PENDING",
                "refund_status": refund_status,
                "refund_id": refund.external_refund_id,
                "terminal_id": refund.terminal_id,
                "status": refund.status,
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
        ):

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

            if payment is None:
                raise ValidationError(
                    "Successful payment not found."
                )

            if not payment.session_id:
                raise ValidationError(
                    "Session ID not found."
                )

            if payment.amount != order.final_price:
                raise ValidationError(
                    "Payment amount mismatch."
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
                    lambda: self.process_refund(
                        refund_request.id,
                    )
                )

            elif destination == RefundRequest.Destination.WALLET:

                raise NotImplementedError(
                    "Wallet refund not implemented."
                )

            else:

                raise ValidationError(
                    "Invalid refund destination."
                )

            order.status = OrderStatus.RETURNED

            order.save(
                update_fields=[
                    "status",
                ]
            )

            return {
                "refund_request_id": refund_request.uuid,
                "destination": destination,
                "status": refund_request.status,
            }