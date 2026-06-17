from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
from celery import shared_task


@shared_task
def send_sms(phone, code):
    print(f"OTP for {phone}: {code}")


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