import logging
from datetime import timedelta
from time import perf_counter

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from order.models import Order, OrderItem, OrderStatus, OrderStatusLog
from order.serializers import OrderCreateSerializer
from users.models import User
from ..models.models import (
    PaymentSession, RefundRequest, Wallet, WalletTransaction,
)
from ..monitoring.monoitoring.metric import (
    GATEWAY_REQUEST_DURATION, PAYMENT_CANCELED,
    PAYMENT_FAILED, PAYMENT_SUCCESS, PAYMENT_TOTAL, VERIFY_DURATION,
)
from ..utils.lock_utils import DistributedLock
from ..utils.utils import (
    check_payment_cooldown, record_payment_failure, reset_payment_cooldown,
)

logger = logging.getLogger(__name__)

WITHDRAWAL_LOCK_HOURS = 3  # هر تغییر موجودی → ۳ ساعت قفل برداشت


def _lock_wallet_withdrawal(wallet: Wallet) -> None:
    """
    بعد از هر تغییر موجودی کیف پول (شارژ، پرداخت، استرداد)
    برداشت را ۳ ساعت قفل می‌کند.
    فقط اگه قفل فعلی کمتر از ۳ ساعت مانده باشد، reset می‌شود.
    """
    wallet.withdraw_blocked_until = timezone.now() + timedelta(hours=WITHDRAWAL_LOCK_HOURS)


class WalletPaymentService:

    def __init__(self, gateway=None):
        self.gateway = gateway

    # ------------------------------------------------------------------
    # PRIVATE HELPERS
    # ------------------------------------------------------------------
    def _calculate_pricing(self, validated_data: dict, request) -> dict:
        serializer = OrderCreateSerializer(data=validated_data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _create_order(self, user: User, pricing: dict) -> Order:
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
            subtotal_raw=pricing["subtotal_raw"],
            total_item_discounts=pricing["total_item_discounts"],
            subtotal_after_items=pricing["subtotal_after_items"],
            order_discount_amount=pricing["order_discount_amount"],
            pickup_cost=pricing["pickup_cost"],
            delivery_cost=pricing["delivery_cost"],
            rush_fee=pricing["rush_fee"],
            paid_at=timezone.now(),
        )
        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product=item["product"],
                size=item["size"],
                pricing_tab=item["pricing_tab"],
                material=item["material_name"],
                quantity=item["quantity"],
                price=item["final_item_price"],
            )
            for item in pricing["computed_items"]
        ])
        system_user, _ = User.objects.get_or_create(
            phone="12345678900", defaults={"fullname": "system"}
        )
        OrderStatusLog.objects.create(
            order=order, user=system_user,
            to_status=OrderStatus.PAID, timestamp=timezone.now(),
        )
        return order

    def _check_withdrawal_eligibility(self, user: User) -> None:
        wallet = getattr(user, "wallet", None)
        if not wallet or not wallet.is_active:
            raise ValidationError("کیف پول فعال یافت نشد.")
        if wallet.withdraw_blocked_until and timezone.now() < wallet.withdraw_blocked_until:
            remaining_hours = (wallet.withdraw_blocked_until - timezone.now()).total_seconds() / 3600
            raise ValidationError(
                f"برداشت تا {remaining_hours:.1f} ساعت دیگر امکان‌پذیر نیست."
            )

    # ------------------------------------------------------------------
    # 1. PAY WITH WALLET
    # ------------------------------------------------------------------
    def pay_with_wallet(self, *, user: User, validated_data: dict, request) -> dict:
        PAYMENT_TOTAL.inc()
        check_payment_cooldown(user.id, "wallet_pay")

        with DistributedLock(key=f"wallet:pay:{user.id}", timeout=30, blocking_timeout=2):
            with transaction.atomic():
                wallet = Wallet.objects.select_for_update().get(user=user, is_active=True)

                pricing = self._calculate_pricing(validated_data, request)
                final_price = pricing["final_price"]

                if not pricing.get("computed_items"):
                    PAYMENT_FAILED.inc()
                    record_payment_failure(user.id, "wallet_pay")
                    raise ValidationError("سبد خرید خالی است")

                if wallet.available_balance < final_price:
                    PAYMENT_FAILED.inc()
                    record_payment_failure(user.id, "wallet_pay")
                    raise ValidationError("موجودی کیف پول کافی نیست")

                wallet.available_balance -= final_price
                _lock_wallet_withdrawal(wallet)  # ← قفل ۳ ساعته
                wallet.save(update_fields=["available_balance", "withdraw_blocked_until"])

                payment = PaymentSession.objects.create(
                    user=user,
                    wallet=wallet,
                    type=PaymentSession.Type.WALLET,
                    amount=final_price,
                    status=PaymentSession.Status.PAID,
                    is_verified=True,
                    paid_at=timezone.now(),
                    verified_at=timezone.now(),
                )

                order = self._create_order(user=user, pricing=pricing)
                payment.order = order
                payment.save(update_fields=["order"])

                WalletTransaction.objects.create(
                    wallet=wallet,
                    payment_session=payment,
                    order=order,
                    amount=final_price,
                    transaction_type=WalletTransaction.Type.PAYMENT,
                    status=WalletTransaction.Status.SUCCESS,
                    description=f"پرداخت سفارش #{order.id} از کیف پول",
                )

                reset_payment_cooldown(user.id, "wallet_pay")
                PAYMENT_SUCCESS.inc()
                transaction.on_commit(lambda: logger.info(f"wallet pay OK — order={order.id}"))
                return {"order_id": order.id, "payment_uuid": str(payment.uuid)}

    # ------------------------------------------------------------------
    # 2. INITIATE WALLET CHARGE
    # ------------------------------------------------------------------
    @transaction.atomic
    def initiate_wallet_charge(self, *, user: User, amount: int) -> dict:
        PAYMENT_TOTAL.inc()
        check_payment_cooldown(user.id, "wallet_charge")

        payment = PaymentSession.objects.create(
            user=user,
            type=PaymentSession.Type.WALLET,
            amount=amount,
            status=PaymentSession.Status.INITIATED,
        )

        t0 = perf_counter()
        result = self.gateway.request_payment(
            amount=amount,
            description="شارژ کیف پول",
            mobile=getattr(user, "phone", None),
        )
        GATEWAY_REQUEST_DURATION.observe(perf_counter() - t0)

        if not result["success"]:
            PAYMENT_FAILED.inc()
            record_payment_failure(user.id, "wallet_charge")
            payment.status = PaymentSession.Status.FAILED
            payment.fail_reason = result.get("error", "")
            payment.gateway_response = result
            payment.save(update_fields=["status", "fail_reason", "gateway_response"])
            raise ValidationError(result.get("error", "خطا در اتصال به درگاه"))

        payment.authority = result["authority"]
        payment.gateway_response = result
        payment.status = PaymentSession.Status.PENDING
        payment.save(update_fields=["authority", "gateway_response", "status"])

        return {
            "payment_url":  result["payment_url"],
            "authority":    result["authority"],
            "payment_uuid": str(payment.uuid),
        }

    # ------------------------------------------------------------------
    # 3. VERIFY WALLET CHARGE
    # ------------------------------------------------------------------
    def verify_wallet_charge(self, *, user: User, authority: str, status: str,
                             callback_payload: dict = None) -> dict:
        t0 = perf_counter()
        check_payment_cooldown(user.id, "wallet_charge")

        with DistributedLock(key=f"verify:charge:{authority}", timeout=60, blocking_timeout=1):
            with transaction.atomic():
                payment = (
                    PaymentSession.objects
                    .select_for_update()
                    .filter(authority=authority, user=user)
                    .first()
                )
                if not payment:
                    raise ValidationError("پرداخت پیدا نشد")

                if payment.is_verified:
                    VERIFY_DURATION.observe(perf_counter() - t0)
                    return {"success": True, "message": "قبلاً تأیید شده", "ref_id": payment.ref_id}

                if status != "OK":
                    PAYMENT_CANCELED.inc()
                    record_payment_failure(user.id, "wallet_charge")
                    payment.status = PaymentSession.Status.CANCELED
                    payment.callback_payload = callback_payload or {}
                    payment.save(update_fields=["status", "callback_payload"])
                    VERIFY_DURATION.observe(perf_counter() - t0)
                    return {"success": False, "message": "پرداخت لغو شد"}

                verify_result = self.gateway.verify_payment(
                    authority=authority, amount=payment.amount
                )

                if not verify_result["success"]:
                    PAYMENT_FAILED.inc()
                    record_payment_failure(user.id, "wallet_charge")
                    payment.status = PaymentSession.Status.FAILED
                    payment.fail_reason = verify_result.get("error", "")
                    payment.verify_response = verify_result
                    payment.save(update_fields=["status", "fail_reason", "verify_response"])
                    VERIFY_DURATION.observe(perf_counter() - t0)
                    raise ValidationError(verify_result.get("error", "تأیید پرداخت ناموفق"))

                payment.status       = PaymentSession.Status.PAID
                payment.is_verified  = True
                payment.session_id = verify_result.get("session_id", "")
                payment.ref_id       = verify_result["ref_id"]
                payment.card_pan     = verify_result.get("card_pan", "")
                payment.verify_response  = verify_result
                payment.callback_payload = callback_payload or {}
                payment.paid_at      = timezone.now()
                payment.verified_at  = timezone.now()
                payment.save()

                wallet, _ = Wallet.objects.get_or_create(user=user, defaults={"is_active": True})
                wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
                wallet.available_balance = F("available_balance") + payment.amount
                _lock_wallet_withdrawal(wallet)  # ← قفل ۳ ساعته
                wallet.save(update_fields=["available_balance", "withdraw_blocked_until"])
                wallet.refresh_from_db()

                WalletTransaction.objects.create(
                    wallet=wallet,
                    payment_session=payment,
                    amount=payment.amount,
                    transaction_type=WalletTransaction.Type.DEPOSIT,
                    status=WalletTransaction.Status.SUCCESS,
                    description=f"شارژ کیف پول — ref_id: {payment.ref_id}",
                )

                reset_payment_cooldown(user.id, "wallet_charge")
                PAYMENT_SUCCESS.inc()
                VERIFY_DURATION.observe(perf_counter() - t0)
                logger.info(f"wallet charged — user={user.id} amount={payment.amount}")
                return {"success": True, "ref_id": payment.ref_id, "amount": payment.amount}

    # ------------------------------------------------------------------
    # 4. REFUND ORDER
    # ------------------------------------------------------------------
    @transaction.atomic
    def refund_order(self, *, order: Order, destination: str, reason: str = "") -> dict:
        if order.status != OrderStatus.PAID:
            raise ValidationError("فقط سفارش‌های پرداخت‌شده قابل استرداد هستند.")

        payment = order.payment_sessions.filter(status=PaymentSession.Status.PAID).first()
        if not payment:
            raise ValidationError("هیچ پرداخت موفقی برای این سفارش یافت نشد.")

        if payment.amount != order.final_price:
            raise ValidationError("مبلغ پرداخت با مبلغ سفارش تطابق ندارد.")

        refund_request = RefundRequest.objects.create(
            user=order.user,
            order=order,
            payment=payment,
            amount=order.final_price,
            destination=destination,
            reason=reason,
            status=RefundRequest.Status.PROCESSING,
        )

        if destination == RefundRequest.Destination.WALLET:
            self._refund_to_wallet(order=order, payment=payment, refund_request=refund_request)

        order.status = OrderStatus.RETURNED
        order.save(update_fields=["status"])
        system_user, _ = User.objects.get_or_create(
            phone="12345678900", defaults={"fullname": "system"}
        )
        OrderStatusLog.objects.create(
            order=order, user=system_user,
            to_status=OrderStatus.RETURNED, timestamp=timezone.now(),
        )

        logger.info(f"refund OK — order={order.id} dest={destination}")
        return {"refund_id": str(refund_request.uuid), "destination": destination}

    def _refund_to_wallet(self, *, order: Order, payment: PaymentSession,
                          refund_request: RefundRequest) -> None:
        wallet = Wallet.objects.select_for_update().get(user=order.user, is_active=True)
        wallet.available_balance = F("available_balance") + order.final_price
        _lock_wallet_withdrawal(wallet)  # ← قفل ۳ ساعته
        wallet.save(update_fields=["available_balance", "withdraw_blocked_until"])
        wallet.refresh_from_db()

        WalletTransaction.objects.create(
            wallet=wallet,
            payment_session=payment,
            order=order,
            amount=order.final_price,
            transaction_type=WalletTransaction.Type.REFUND_TO_WALLET,
            status=WalletTransaction.Status.SUCCESS,
            description=f"استرداد سفارش #{order.id} به کیف پول",
        )

        refund_request.status = RefundRequest.Status.COMPLETED
        refund_request.completed_at = timezone.now()
        refund_request.processed_at = timezone.now()
        refund_request.save(update_fields=["status", "completed_at", "processed_at"])