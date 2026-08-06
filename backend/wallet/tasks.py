from celery import shared_task

from django.db import transaction
from django.utils import timezone

import logging

from wallet.models import (
    RefundRequest,
    WalletTransaction,
    PaymentSession,
)

from wallet.services.service_refund import RefundService
from wallet.services.refund import *
from wallet.models.setting_payment_models import PaymentTerminal


logger = logging.getLogger(__name__)


@shared_task
def process_refund_task(refund_id):
    Refund().process_refund(refund_id)


@shared_task
def check_pending_refunds():
    """
    Check all refunds in PROCESSING status by querying the refund service.
    Each refund is processed independently; one failure does not affect others.
    """
    refunds = RefundRequest.objects.filter(
        status=RefundRequest.Status.PROCESSING
    ).select_related("payment")

    terminal = (
        PaymentTerminal.objects
        .filter(is_active=True)
        .first()
    )

    if not terminal:
        logger.info("No active payment terminal found. Skipping pending refund check.")
        return

    refund_service = RefundService(terminal=terminal)

    for refund in refunds:
        try:
            # Validate required fields before making the inquiry
            if not _validate_refund_fields(refund):
                continue

            result = refund_service.refund_inquiry(
                terminal_id=refund.terminal_id,
                session_id=refund.payment.zarinpal_session_id,
            )

            refund_status = result.get("refund_status")

            _process_refund_status(refund, refund_status)

        except Exception as e:
            # Catch any unexpected exception to prevent the entire task from failing
            logger.error(
                "Unexpected error processing refund inquiry for refund_id=%s: %s",
                refund.id,
                str(e),
                exc_info=True,
            )
            continue


def _validate_refund_fields(refund):
    """
    Validate that all required fields are present before calling refund_inquiry.
    Returns True if valid, False otherwise.
    """
    if not refund.terminal_id:
        logger.warning(
            "Skipping refund inquiry for refund_id=%s: missing terminal_id",
            refund.id,
        )
        return False

    if not refund.payment:
        logger.warning(
            "Skipping refund inquiry for refund_id=%s: missing related payment",
            refund.id,
        )
        return False

    if not refund.payment.zarinpal_session_id:
        logger.warning(
            "Skipping refund inquiry for refund_id=%s: missing zarinpal_session_id on payment_id=%s",
            refund.id,
            refund.payment.id,
        )
        return False

    return True


def _process_refund_status(refund, refund_status):
    """
    Process the refund status returned by the refund service.
    Handles SUCCESS and FAILED statuses within an atomic transaction.
    """
    try:
        with transaction.atomic():
            transaction_obj = (
                WalletTransaction.objects
                .select_for_update()
                .get(refund=refund)
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

                logger.info(
                    "Refund completed successfully for refund_id=%s, payment_id=%s",
                    refund.id,
                    refund.payment.id,
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

                logger.error(
                    "Refund failed for refund_id=%s, payment_id=%s",
                    refund.id,
                    refund.payment.id,
                )
    except WalletTransaction.DoesNotExist:
        logger.error(
            "WalletTransaction not found for refund_id=%s. Skipping status update.",
            refund.id,
        )


@shared_task
def expire_payment_sessions():
    """
    Expire payment sessions that have passed their expiration time.
    Logs expired sessions and sets fail_reason if the field exists on the model.
    Uses bulk update for performance.
    """
    expired_sessions = PaymentSession.objects.filter(
        status__in=[
            PaymentSession.Status.INITIATED,
            PaymentSession.Status.PENDING,
        ],
        expire_at__lt=timezone.now(),
    )

    # Check if fail_reason field exists on PaymentSession model using Django metadata
    has_fail_reason = _has_fail_reason_field()

    if has_fail_reason:
        # Use bulk update to set both status and fail_reason efficiently
        count = expired_sessions.update(
            status=PaymentSession.Status.EXPIRED,
            fail_reason="session expired",
        )
        if count > 0:
            logger.info(
                "Expired %d payment session(s) with fail_reason='session expired'",
                count,
            )
    else:
        # fail_reason field does not exist on the model; use bulk update
        # to preserve existing behavior. No schema changes are introduced.
        count = expired_sessions.update(
            status=PaymentSession.Status.EXPIRED
        )
        if count > 0:
            logger.info(
                "Bulk expired %d payment session(s) (fail_reason field not present on model)",
                count,
            )


def _has_fail_reason_field():
    """
    Safely check if the PaymentSession model has a 'fail_reason' field
    using Django model metadata.
    """
    try:
        PaymentSession._meta.get_field("fail_reason")
        return True
    except Exception:
        return False