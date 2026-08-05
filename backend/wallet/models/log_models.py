import uuid
from django.db import models
from users.models import User
from .models import *



"""
ین مدل یک لاگ حسابرسی مالی (Financial Audit Log) است. هدفش این است که هر اتفاق مهم مالی در سیستم را ثبت کند؛ مثلاً شروع پرداخت، موفق شدن پرداخت، ایجاد بازگشت وجه، برداشت و... تا بعداً بتوان بررسی کرد چه کسی، چه کاری، چه زمانی و با چه اطلاعاتی انجام داده است.
"""
class FinancialAuditLog(models.Model):

    class Action(models.TextChoices):
        PAYMENT_INITIATED  = "PAYMENT_INITIATED"
        PAYMENT_VERIFIED   = "PAYMENT_VERIFIED"
        PAYMENT_FAILED     = "PAYMENT_FAILED"
        PAYMENT_CANCELED   = "PAYMENT_CANCELED"
        ORDER_CREATED      = "ORDER_CREATED"
        REFUND_CREATED     = "REFUND_CREATED"
        REFUND_COMPLETED   = "REFUND_COMPLETED"
        WITHDRAWAL_CREATED   = "WITHDRAWAL_CREATED"
        WITHDRAWAL_COMPLETED = "WITHDRAWAL_COMPLETED"
        WITHDRAWAL_FAILED    = "WITHDRAWAL_FAILED"

    uuid    = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    action  = models.CharField(max_length=50, choices=Action.choices)
    user    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    payment = models.ForeignKey(PaymentSession, on_delete=models.SET_NULL, null=True, blank=True)
    old_data   = models.JSONField(default=dict, blank=True)
    new_data   = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["action"]),
            models.Index(fields=["user"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.action} | {self.user} | {self.created_at:%Y-%m-%d %H:%M}"