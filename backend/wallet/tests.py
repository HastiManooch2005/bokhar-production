
from celery import shared_task
from django.utils import timezone

from .models.models import PaymentSession


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