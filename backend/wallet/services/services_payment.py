import logging
from time import perf_counter

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from order.models import Order, OrderItem, OrderStatus, OrderStatusLog
from order.serializers import OrderCreateSerializer
from users.models import User
from  ..models.models import PaymentSession, Wallet, WalletTransaction, WithdrawalRequest
from ..monitoring.monitoring import *
from ..utils.lock_utils import DistributedLock
from ..utils.utils import *
from .service_helper import create_audit_log

logger = logging.getLogger(__name__)


class PaymentService:

    def __init__(self, zarinpal_client):
        self.gateway = zarinpal_client

    # ------------------------------------------------------------------
    # PRIVATE HELPERS
    # ------------------------------------------------------------------
    def _create_order(self, user: User, pricing: dict) -> Order:
        """
        سفارش را داخل یک تراکنش اتمیک می‌سازد.
        فقط بعد از تأیید پرداخت فراخوانی می‌شود.
        """
        order = Order.objects.create(
            user=user,
            address=pricing["address"],
            pickup_date=pricing["pickup_date"],
            pickup_shift=pricing["pickup_shift"],
            delivery_date=pricing["delivery_date"],
            delivery_shift=pricing["delivery_shift"],
            description=pricing.get("description", ""),
            status=OrderStatus.PAID,
            final_price=pricing["final_price"],
            paid_at=timezone.now(),
        )
        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=i["product"],
                size=i["size"],
                pricing_tab=i["pricing_tab"],
                material=i["material_name"],
                quantity=i["quantity"],
                price=i["final_item_price"],
            )
            for i in pricing["computed_items"]
        ])
        system_user, _ = User.objects.get_or_create(
            phone="12345678900", defaults={"fullname": "system"}
        )
        OrderStatusLog.objects.create(
            order=order,
            user=system_user,
            to_status=OrderStatus.PAID,
            timestamp=timezone.now(),
        )
        return order

    # ------------------------------------------------------------------
    # 1. INITIATE PAYMENT — درخواست پرداخت به زرین‌پال
    # ------------------------------------------------------------------
    @transaction.atomic
    def initiate_payment(self, user: User, validated_data: dict, request) -> dict:
        """
        مرحله اول: اعتبارسنجی سبد، محاسبه قیمت، ساخت PaymentSession و
        دریافت لینک درگاه از زرین‌پال.

        ⚠️  سفارش اینجا ساخته نمی‌شود — فقط بعد از تأیید پرداخت ساخته می‌شود.
        snapshot قیمت داخل gateway_request ذخیره می‌شود تا در verify استفاده شود.
        """
        PAYMENT_TOTAL.inc()
        check_payment_cooldown(user.id, "gateway_pay")

        # اعتبارسنجی و محاسبه قیمت
        serializer = OrderCreateSerializer(data=validated_data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        pricing = serializer.save()

        if not pricing.get("computed_items"):
            PAYMENT_FAILED.inc()
            record_payment_failure(user.id, "gateway_pay")
            raise ValidationError("سبد خرید خالی است")

        # ساخت session — بدون terminal چون حذف شد
        payment = PaymentSession.objects.create(
            user=user,
            type=PaymentSession.Type.ORDER,
            amount=pricing["final_price"],
            status=PaymentSession.Status.INITIATED,
            gateway_request={"pricing_snapshot": pricing},
        )

        create_audit_log(
            action="PAYMENT_INITIATED",
            user=user,
            payment=payment,
            new_data={"amount": payment.amount},
        )

        # درخواست به زرین‌پال
        t0 = perf_counter()
        result = self.gateway.request_payment(
            amount=payment.amount,
            description=f"پرداخت سفارش خشکشویی - کاربر {user.id}",
            mobile=getattr(user, "phone", None),
        )
        GATEWAY_REQUEST_DURATION.observe(perf_counter() - t0)

        if not result["success"]:
            PAYMENT_FAILED.inc()
            record_payment_failure(user.id, "gateway_pay")
            payment.status = PaymentSession.Status.FAILED
            payment.fail_reason = result.get("error", "gateway error")
            payment.save(update_fields=["status", "fail_reason"])
            raise ValidationError(result["error"])

        payment.authority = result["authority"]
        payment.gateway_response = result
        payment.status = PaymentSession.Status.PENDING
        payment.save(update_fields=["authority", "gateway_response", "status"])

        return {
            "payment_url": result["payment_url"],
            "authority":   payment.authority,
            "payment_uuid": str(payment.uuid),
        }

    # ------------------------------------------------------------------
    # 2. VERIFY PAYMENT — تأیید پرداخت بعد از redirect کاربر
    # ------------------------------------------------------------------
    def verify_payment(self, *, authority: str, callback_payload: dict = None) -> dict:
        """
        مرحله دوم: تأیید با زرین‌پال، ساخت سفارش، ثبت تراکنش کیف پول.
        Idempotent است — اگر قبلاً تأیید شده باشد همان نتیجه را برمی‌گرداند.
        """
        with DistributedLock(key=f"verify:{authority}", timeout=60, blocking_timeout=1):
            with transaction.atomic():
                payment = (
                    PaymentSession.objects
                    .select_for_update()
                    .filter(authority=authority)
                    .first()
                )
                if not payment:
                    raise ValidationError("تراکنش یافت نشد.")

                # idempotent: قبلاً تأیید شده
                if payment.is_verified:
                    return {
                        "success":  True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id":   payment.ref_id,
                    }

                # تأیید با زرین‌پال
                t0 = perf_counter()
                verify_result = self.gateway.verify_payment(
                    authority=authority,
                    amount=payment.amount,
                )
                VERIFY_DURATION.observe(perf_counter() - t0)

                payment.verify_response = verify_result

                if not verify_result["success"]:
                    PAYMENT_FAILED.inc()
                    payment.status = PaymentSession.Status.FAILED
                    payment.fail_reason = verify_result.get("error", "verify failed")
                    payment.save(update_fields=["status", "verify_response", "fail_reason"])
                    create_audit_log(
                        action="PAYMENT_FAILED",
                        user=payment.user,
                        payment=payment,
                        new_data={"status": payment.status},
                    )
                    return {"success": False, "error": verify_result.get("error")}

                # بعد از تأیید زرین‌پال، یک‌بار دیگر چک می‌کنیم (race condition)
                payment.refresh_from_db()
                if payment.is_verified:
                    return {
                        "success":  True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id":   payment.ref_id,
                    }

                # ثبت نتیجه پرداخت
                payment.status      = PaymentSession.Status.PAID
                payment.is_verified = True
                payment.ref_id      = verify_result["ref_id"]
                payment.card_pan    = verify_result.get("card_pan", "")
                payment.callback_payload = callback_payload or {}
                payment.paid_at     = timezone.now()
                payment.verified_at = timezone.now()

                # ساخت سفارش (فقط اینجا، نه در initiate)
                if not payment.order_id:
                    pricing = payment.gateway_request.get("pricing_snapshot")
                    order = self._create_order(payment.user, pricing)
                    payment.order = order

                payment.save()

                # ثبت تراکنش کیف پول (تاریخچه)
                wallet, _ = Wallet.objects.get_or_create(
                    user=payment.user,
                    defaults={"is_active": True},
                )
                WalletTransaction.objects.get_or_create(
                    payment_session=payment,
                    transaction_type=WalletTransaction.Type.PAYMENT,
                    defaults={
                        "wallet":  wallet,
                        "order":   payment.order,
                        "amount":  payment.amount,
                        "status":  WalletTransaction.Status.SUCCESS,
                        "description": f"پرداخت سفارش #{payment.order_id}",
                    },
                )

                PAYMENT_SUCCESS.inc()
                reset_payment_cooldown(payment.user_id, "gateway_pay")
                create_audit_log(
                    action="PAYMENT_VERIFIED",
                    user=payment.user,
                    payment=payment,
                    new_data={"ref_id": payment.ref_id, "order_id": payment.order_id},
                )

                return {
                    "success":  True,
                    "order_id": payment.order_id,
                    "ref_id":   payment.ref_id,
                }

    # ------------------------------------------------------------------
    # 3. WITHDRAW TO BANK — برداشت آزاد از کیف پول به حساب بانکی
    # ------------------------------------------------------------------
    @transaction.atomic
    def withdraw_to_bank(self, *, user: User, amount: int, iban: str, account_holder: str) -> dict:
        """
        کاربر می‌تواند موجودی کیف پولش را به حساب بانکی خودش منتقل کند.

        ⚠️  این عملیات مستقل از هر سفارش است و ربطی به request_refund ندارد.
            درخواست ثبت می‌شود و ادمین/تسک آن را از طریق پنل زرین‌پال پردازش می‌کند.
        """
        self._check_withdrawal_eligibility(user)
        check_payment_cooldown(user.id, "withdraw")

        wallet = Wallet.objects.select_for_update().get(user=user, is_active=True)

        if wallet.available_balance < amount:
            record_payment_failure(user.id, "withdraw")
            raise ValidationError("موجودی کافی نیست.")

        # قفل موجودی تا پردازش توسط ادمین
        wallet.available_balance -= amount
        wallet.locked_balance    += amount
        wallet.save(update_fields=["available_balance", "locked_balance"])

        withdrawal = WithdrawalRequest.objects.create(
            user=user,
            wallet=wallet,
            amount=amount,
            iban=iban,
            account_holder=account_holder,
            status=WithdrawalRequest.Status.PENDING,
        )

        WalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type=WalletTransaction.Type.WITHDRAWAL,
            status=WalletTransaction.Status.PENDING,
            description=f"درخواست برداشت #{withdrawal.id} — {iban}",
        )

        create_audit_log(
            action="WITHDRAWAL_REQUESTED",
            user=user,
            new_data={"amount": amount, "iban": iban, "withdrawal_id": withdrawal.id},
        )

        # پردازش واقعی توسط ادمین یا Celery task انجام می‌شود
        return {
            "success":       True,
            "withdrawal_id": str(withdrawal.uuid),
            "message":       "درخواست برداشت ثبت شد و در صف پردازش قرار گرفت.",
        }

    # ------------------------------------------------------------------
    # PRIVATE: WITHDRAWAL ELIGIBILITY CHECK
    # ------------------------------------------------------------------
    def _check_withdrawal_eligibility(self, user: User) -> None:
        wallet = getattr(user, "wallet", None)
        if not wallet or not wallet.is_active:
            wallet = Wallet.objects.create(user=user, is_active=True)
        if wallet.withdraw_blocked_util and timezone.now() < wallet.withdraw_blocked_util:
            remaining_hours = (wallet.withdraw_blocked_util - timezone.now()).total_seconds() / 3600
            raise ValidationError(f"برداشت تا {remaining_hours:.1f} ساعت دیگر امکان‌پذیر نیست.")



