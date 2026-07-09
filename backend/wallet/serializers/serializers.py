from rest_framework import serializers

from order.models import Order
from ..models.models import RefundRequest, WalletTransaction, WithdrawalRequest


# =========================================================
# 1. پرداخت سفارش از درگاه
# =========================================================
class PaymentCreateSerializer(serializers.Serializer):
    """
    فقط داده‌های سفارش لازمه — terminal حذف شده.
    داده‌های سفارش (آدرس، آیتم‌ها و ...) از OrderCreateSerializer پردازش میشه.
    """
    pass  # در صورت نیاز فیلدهای extra مثل description اینجا اضافه کن


from rest_framework import serializers



class RefundProcessSerializer(serializers.Serializer):
    uuid = serializers.UUIDField()

    def validate_uuid(self, value):
        try:
            refund = RefundRequest.objects.get(uuid=value)
        except RefundRequest.DoesNotExist:
            raise serializers.ValidationError("درخواست یافت نشد.")

        self.context["refund"] = refund
        return value

# =========================================================
# 2. تأیید پرداخت (callback زرین‌پال)
# =========================================================
class PaymentVerifySerializer(serializers.Serializer):
    """
    زرین‌پال فقط Authority و Status را در query string برمی‌گرداند.
    amount را نمی‌فرستد — از PaymentSession خوانده می‌شود.
    """
    Authority = serializers.CharField(max_length=255)
    Status    = serializers.CharField(max_length=10)

    def validate_Status(self, value: str) -> str:
        normalized = value.upper()
        if normalized not in ("OK", "NOK"):
            raise serializers.ValidationError(
                "وضعیت ارسالی از درگاه نامعتبر است (باید OK یا NOK باشد)."
            )
        return normalized


# =========================================================
# 3. شارژ کیف پول از درگاه
# =========================================================
class WalletChargeSerializer(serializers.Serializer):
    amount = serializers.IntegerField(
        min_value=100_000,
        max_value=10_000_000,
        error_messages={
            "min_value": "حداقل مبلغ شارژ ۱۰۰٬۰۰۰ ریال است.",
            "max_value": "حداکثر مبلغ شارژ ۱۰٬۰۰۰٬۰۰۰ ریال است.",
        },
    )


# =========================================================
# 4. پرداخت سفارش از کیف پول
# =========================================================
class WalletPaymentSerializer(serializers.Serializer):
    """
    داده‌های سفارش از OrderCreateSerializer پردازش میشه.
    این serializer در صورت نیاز به فیلد extra قابل گسترش است.
    """
    pass


# =========================================================
# 5. درخواست استرداد سفارش
# =========================================================
class RefundRequestSerializer(serializers.ModelSerializer):
    order       = serializers.PrimaryKeyRelatedField(queryset=Order.objects.all())
    destination = serializers.ChoiceField(choices=RefundRequest.Destination.choices)

    class Meta:
        model  = RefundRequest
        fields = ["order", "amount", "destination", "reason"]

    def validate(self, attrs):
        order  = attrs["order"]
        amount = attrs["amount"]

        if order.status != "paid":
            raise serializers.ValidationError(
                {"order": "فقط سفارش‌های پرداخت‌شده قابل استرداد هستند."}
            )

        if amount > order.final_price:
            raise serializers.ValidationError(
                {"amount": "مبلغ استرداد نمی‌تواند بیشتر از مبلغ سفارش باشد."}
            )

        # جلوگیری از ثبت چند درخواست موازی برای یه سفارش
        pending_exists = RefundRequest.objects.filter(
            order=order,
            status__in=[
                RefundRequest.Status.PENDING,
                RefundRequest.Status.APPROVED,
                RefundRequest.Status.PROCESSING,
            ],
        ).exists()
        if pending_exists:
            raise serializers.ValidationError(
                {"order": "یک درخواست استرداد در حال پردازش برای این سفارش وجود دارد."}
            )

        return attrs


# =========================================================
# 6. درخواست برداشت از کیف پول به حساب بانکی
# =========================================================
class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """
    کاربر IBAN و نام صاحب حساب را وارد می‌کند.
    پردازش توسط ادمین یا Celery task انجام می‌شود.
    """

    class Meta:
        model  = WithdrawalRequest
        fields = ["amount", "iban", "account_holder"]

    def validate_amount(self, value: int) -> int:
        if value <= 0:
            raise serializers.ValidationError("مبلغ برداشت باید بزرگ‌تر از صفر باشد.")
        if value < 100_000:
            raise serializers.ValidationError("حداقل مبلغ برداشت ۱۰۰٬۰۰۰ ریال است.")
        return value

    def validate_iban(self, value: str) -> str:
        # شبا ایران: IR + 24 رقم = 26 کاراکتر
        value = value.strip().upper()
        if not value.startswith("IR") or len(value) != 26 or not value[2:].isdigit():
            raise serializers.ValidationError(
                "شماره شبا نامعتبر است. فرمت صحیح: IR + 24 رقم"
            )
        return value


# =========================================================
# 7. تاریخچه تراکنش‌های کیف پول
# =========================================================
class WalletTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(
        source="get_transaction_type_display", read_only=True
    )
    status_display = serializers.CharField(
        source="get_status_display", read_only=True
    )

    class Meta:
        model  = WalletTransaction
        fields = [
            "uuid",
            "amount",
            "transaction_type",
            "transaction_type_display",
            "status",
            "status_display",
            "description",
            "created_at",
        ]
        read_only_fields = fields