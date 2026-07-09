import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from users.models import User
from order.models import Order
from .setting_payment_models import *
# =========================================================
# WALLET — کیف پول کاربر
# =========================================================
class Wallet(models.Model):
    """
    هر کاربر یک کیف پول دارد.
    available_balance: موجودی قابل استفاده
    locked_balance:    در حال پردازش (مثلاً برداشت در جریان)
    """

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wallet")
    available_balance = models.BigIntegerField(default=0)
    locked_balance = models.BigIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    withdraw_blocked_until = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Wallet({self.user})"


# =========================================================
# PAYMENT SESSION — ارتباط با زرین‌پال
# =========================================================
class PaymentSession(models.Model):
    """
    هر بار که کاربر وارد درگاه می‌شود یک session ساخته می‌شود.
    می‌تواند برای پرداخت سفارش یا شارژ کیف پول باشد.
    """

    class Type(models.TextChoices):
        ORDER  = "order",  "پرداخت سفارش"
        WALLET = "wallet", "شارژ کیف پول"

    class Status(models.TextChoices):
        INITIATED = "INITIATED", "ایجاد شده"
        PENDING   = "PENDING",   "در انتظار پرداخت"
        PAID      = "PAID",      "پرداخت شده"
        FAILED    = "FAILED",    "ناموفق"
        CANCELED  = "CANCELED",  "لغو شده"
        REFUNDED  = "REFUNDED",  "مسترد شده"
        EXPIRED   = "EXPIRED",   "منقضی شده"

    uuid   = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user   = models.ForeignKey(User, on_delete=models.PROTECT, related_name="payment_sessions")
    # یکی از این دو پر می‌شود، نه هر دو
    order  = models.ForeignKey(Order,  on_delete=models.SET_NULL, null=True, blank=True, related_name="payment_sessions")
    wallet = models.ForeignKey(Wallet, on_delete=models.SET_NULL, null=True, blank=True, related_name="payment_sessions")

    type   = models.CharField(max_length=10, choices=Type.choices)
    amount = models.BigIntegerField(validators=[MinValueValidator(1)])

    # زرین‌پال
    authority        = models.CharField(max_length=255, null=True, blank=True, unique=True)
    ref_id           = models.CharField(max_length=255, null=True, blank=True, unique=True)
    card_pan         = models.CharField(max_length=30, blank=True)
    gateway_response = models.JSONField(default=dict)   # پاسخ اولیه
    verify_response  = models.JSONField(default=dict)   # پاسخ تأیید
    callback_payload = models.JSONField(default=dict)   # داده‌های بازگشتی



    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.INITIATED)
    is_verified = models.BooleanField(default=False)
    fail_reason = models.TextField(blank=True)

    expire_at   = models.DateTimeField(null=True, blank=True)
    paid_at     = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["authority"]),
            models.Index(fields=["ref_id"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"PaymentSession({self.uuid} | {self.status})"


# =========================================================
# WALLET TRANSACTION — تاریخچه کیف پول
# =========================================================
class WalletTransaction(models.Model):
    """
    هر تغییر موجودی کیف پول اینجا ثبت می‌شود.
    deposit:        شارژ (از درگاه یا refund)
    payment:        پرداخت سفارش از کیف پول
    withdrawal:     برداشت به حساب بانکی
    refund_to_wallet: استرداد سفارش به کیف پول
    """

    class Type(models.TextChoices):
        DEPOSIT           = "deposit",          "شارژ کیف پول"
        PAYMENT           = "payment",          "پرداخت سفارش"
        WITHDRAWAL        = "withdrawal",       "برداشت به حساب"
        REFUND_TO_WALLET  = "refund_to_wallet", "استرداد به کیف پول"
        REFUND = "refund","استرداد به حساب"

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار"
        SUCCESS = "success", "موفق"
        FAILED  = "failed",  " ناموفق"

    refund = models.ForeignKey(
        RefundRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )

    uuid             = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    wallet           = models.ForeignKey(Wallet, on_delete=models.CASCADE, null=True,blank=True,related_name="transactions")
    payment_session  = models.ForeignKey(PaymentSession, on_delete=models.SET_NULL, null=True, blank=True, related_name="wallet_transactions")
    order            = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)

    amount           = models.BigIntegerField(validators=[MinValueValidator(1)])
    transaction_type = models.CharField(max_length=30, choices=Type.choices)
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    description      = models.TextField(blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["transaction_type"]),
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.transaction_type} | {self.amount} | {self.status}"


# =========================================================
# REFUND REQUEST — استرداد سفارش
# =========================================================
class RefundRequest(models.Model):
    """
    وقتی کاربر لغو سفارش یا استرداد می‌خواد.
    destination مشخص می‌کند پول به کجا برگردد:
      - wallet:  به کیف پول داخل اپ
      - bank:    به حساب بانکی (از طریق زرین‌پال reverse)
    """

    class Status(models.TextChoices):
        PENDING    = "pending",    "در انتظار بررسی"
        APPROVED   = "approved",   "تأیید شده"
        PROCESSING = "processing", "در حال پردازش"
        COMPLETED  = "completed",  "انجام شده"
        FAILED     = "failed",     "ناموفق"
        CANCELED   = "canceled",   "لغو شده"

    class Destination(models.TextChoices):
        WALLET = "wallet", "کیف پول"
        BANK   = "bank",   "حساب بانکی"

    uuid        = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user        = models.ForeignKey(User, on_delete=models.PROTECT, related_name="refund_requests")
    order       = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="refund_requests")
    payment     = models.ForeignKey(PaymentSession, on_delete=models.PROTECT, related_name="refund_requests")

    amount      = models.BigIntegerField(validators=[MinValueValidator(1)])
    destination = models.CharField(max_length=10, choices=Destination.choices)  # ← کاربر انتخاب می‌کند
    reason      = models.TextField(blank=True)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    fail_reason = models.TextField(blank=True)

    external_refund_id = models.CharField(max_length=100, blank=True)
    terminal_id = models.CharField(max_length=50, blank=True)

    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [models.Index(fields=["status"])]
        constraints = [
            models.CheckConstraint(check=Q(amount__gt=0), name="refund_amount_gt_zero")
        ]

    def __str__(self):
        return f"Refund({self.uuid} → {self.destination})"


# =========================================================
# WITHDRAWAL REQUEST — برداشت آزاد از کیف پول
# =========================================================
class WithdrawalRequest(models.Model):
    """
    کاربر می‌تواند موجودی کیف پولش را (مستقل از هر سفارش)
    به حساب بانکی خود منتقل کند.
    پردازش توسط ادمین یا سرویس پایا انجام می‌شود.
    """

    class Status(models.TextChoices):
        PENDING    = "pending",    "در انتظار"
        PROCESSING = "processing", "در حال پردازش"
        COMPLETED  = "completed",  "انجام شده"
        FAILED     = "failed",     "ناموفق"
        REJECTED   = "rejected",   "رد شده"

    uuid           = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user           = models.ForeignKey(User, on_delete=models.PROTECT, related_name="withdrawal_requests")
    wallet         = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="withdrawals")

    amount         = models.BigIntegerField(validators=[MinValueValidator(1)])
    iban           = models.CharField(max_length=34)       # شبا مقصد
    account_holder = models.CharField(max_length=255)      # نام صاحب حساب

    status         = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    fail_reason    = models.TextField(blank=True)

    processed_at   = models.DateTimeField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Withdrawal({self.user} | {self.amount} | {self.status})"