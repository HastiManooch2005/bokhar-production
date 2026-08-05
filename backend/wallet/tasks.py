from celery import shared_task

from django.db import transaction
from django.utils import timezone

from wallet.models import (
    RefundRequest,
    WalletTransaction,
    PaymentSession,
)

from wallet.services.service_refund import RefundService
from wallet.services.refund import *
from wallet.models.setting_payment_models import PaymentTerminal


@shared_task
def process_refund_task(refund_id):
    Refund().process_refund(refund_id)

@shared_task
def check_pending_refunds():

    refunds = RefundRequest.objects.filter(
        status=RefundRequest.Status.PROCESSING
    )

    terminal = (
        PaymentTerminal.objects
        .filter(is_active=True)
        .first()
    )

    if not terminal:
        return


    refund_service = RefundService(
        terminal=terminal
    )


    for refund in refunds:

        result = refund_service.refund_inquiry(
            terminal_id=refund.terminal_id,
            session_id=refund.payment.zarinpal_session_id,
        )


        refund_status = result.get("refund_status")


        with transaction.atomic():

            transaction_obj = (
                WalletTransaction.objects
                .select_for_update()
                .get(refund=refund)
            )


            if refund_status == "SUCCESS":

                refund.status = RefundRequest.Status.COMPLETED
                refund.completed_at = timezone.now()

                refund.payment.status = (
                    PaymentSession.Status.REFUNDED
                )

                refund.payment.refunded_at = timezone.now()

                transaction_obj.status = (
                    WalletTransaction.Status.SUCCESS
                )


                refund.payment.save(
                    update_fields=[
                        "status",
                        "refunded_at",
                    ]
                )

                transaction_obj.save(
                    update_fields=[
                        "status"
                    ]
                )

                refund.save(
                    update_fields=[
                        "status",
                        "completed_at",
                    ]
                )


            elif refund_status == "FAILED":

                refund.status = (
                    RefundRequest.Status.FAILED
                )

                transaction_obj.status = (
                    WalletTransaction.Status.FAILED
                )

                transaction_obj.save(
                    update_fields=["status"]
                )

                refund.save(
                    update_fields=["status"]
                )

@shared_task
def expire_payment_sessions():

    PaymentSession.objects.filter(
        status__in=[
            PaymentSession.Status.INITIATED,
            PaymentSession.Status.PENDING,
        ],
        expire_at__lt=timezone.now(),
    ).update(
        status=PaymentSession.Status.EXPIRED
    )