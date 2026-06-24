from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from celery import shared_task

import os
import requests
from django.conf import settings
from celery import shared_task


@shared_task
def send_sms(phone: str, code: str):
    url = "https://rest.payamak-panel.com/api/SendSMS/SendSMS"

    payload = {
        "username": settings.PAYAMAK_USERNAME,
        "password": settings.PAYAMAK_API_KEY,
        "to": phone,
        "from": settings.PAYAMAK_SENDER,
        "text": f"کد تایید شما: {code}\nلغو11",
        "isFlash": False,
    }

    try:
        response = requests.post(url, json=payload, timeout=15)
        response.raise_for_status()

        data = response.json()

        if data.get("RetStatus") != 1:
            raise Exception(
                f"SMS Error: {data.get('StrRetStatus')} - {data}"
            )

        return data

    except requests.RequestException as exc:
        raise Exception(f"Payamak request failed: {exc}")

@shared_task
def clear_expired_blacklisted_tokens():
    now = timezone.now()

    # فقط توکن‌هایی که:
    # ۱. منقضی شدند
    # ۲. در بلک‌لیست هستند (لاگ‌اوت شدند)
    expired_blacklisted = OutstandingToken.objects.filter(
        expires_at__lt=now,
        blacklistedtoken__isnull=False  # بلک‌لیست شده باشد
    )

    count = expired_blacklisted.count()
    expired_blacklisted.delete()  # BlacklistedToken هم cascade پاک می‌شود

    return f"{count} توکن منقضی و بلک‌لیست شده پاک شد"