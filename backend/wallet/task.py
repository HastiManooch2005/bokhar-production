from celery import shared_task

from django.db import transaction
from django.utils import timezone

from wallet.models import (
    RefundRequest,
    WalletTransaction,
    PaymentSession,
)

from payment.zarinpal import ZarinPal
@shared_task
def check_pending_refunds():

    refunds = RefundRequest.objects.filter(
        status=RefundRequest.Status.PROCESSING
    )

    gateway = ZarinPal()

    for refund in refunds:

        result = gateway.refund_inquiry(
            terminal_id=refund.terminal_id,
            session_id=refund.payment.session_id,
        )

        if not result["success"]:
            continue

        refund_status = result["refund_status"]

        with transaction.atomic():

            transaction_obj = WalletTransaction.objects.select_for_update().get(
                refund=refund
            )

            if refund_status == "SUCCESS":

                refund.status = RefundRequest.Status.COMPLETED
                refund.completed_at = timezone.now()

                refund.payment.status = PaymentSession.Status.REFUNDED
                refund.payment.refunded_at = timezone.now()

                transaction_obj.status = WalletTransaction.Status.SUCCESS

                refund.payment.save(
                    update_fields=[
                        "status",
                        "refunded_at",
                    ]
                )

                transaction_obj.save(
                    update_fields=[
                        "status",
                    ]
                )

                refund.save(
                    update_fields=[
                        "status",
                        "completed_at",
                    ]
                )

            elif refund_status == "FAILED":

                refund.status = RefundRequest.Status.FAILED

                transaction_obj.status = WalletTransaction.Status.FAILED

                transaction_obj.save(
                    update_fields=["status"]
                )

                refund.save(
                    update_fields=["status"]
                )