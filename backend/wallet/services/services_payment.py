import logging
from datetime import date
from time import perf_counter

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from order.models import Order, OrderItem, OrderStatus, OrderStatusLog
from order.serializers import OrderCreateSerializer
from users.models import User, Address
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
    def _serialize_pricing_snapshot(self, pricing: dict) -> dict:
        """
        pricing خروجی OrderCreateSerializer.create() است و شامل شیء‌های مدل جنگو است
        (Product, ProductPricingTab, Size, Address, ...) که در JSONField قابل ذخیره نیستند.
        این متد یک نسخهٔ فقط-ID و JSON-safe می‌سازد تا بین initiate و verify (که ممکن است
        در دو request/worker جدا اجرا شوند) امن ذخیره و بازیابی شود.
        """
        return {
            "address_id": pricing["address"].id,
            "pickup_template_id": pricing["pickup_template"].id,
            "delivery_template_id": pricing["delivery_template"].id,
            "applied_coupon_id": pricing["applied_coupon"].id if pricing.get("applied_coupon") else None,
            "subtotal_raw": pricing["subtotal_raw"],
            "total_item_discounts": pricing["total_item_discounts"],
            "subtotal_after_items": pricing["subtotal_after_items"],
            "order_discount_amount": pricing["order_discount_amount"],
            "pickup_cost": pricing["pickup_cost"],
            "delivery_cost": pricing["delivery_cost"],
            "rush_fee": pricing["rush_fee"],
            "percent_fee": pricing["percent_fee"],
            "final_price": pricing["final_price"],
            "description": pricing.get("description", ""),
            "pickup_date": pricing["pickup_date"].isoformat(),
            "pickup_shift": pricing["pickup_shift"],
            "delivery_date": pricing["delivery_date"].isoformat(),
            "delivery_shift": pricing["delivery_shift"],
            "computed_items": [
                {
                    "product_id": i["product"].id,
                    "pricing_tab_id": i["pricing_tab"].id,
                    "size_id": i["size"].id if i.get("size") else None,
                    "material_name": i["material_name"],
                    "quantity": i["quantity"],
                    "original_price": i["original_price"],
                    "item_discount": i["item_discount"],
                    "final_item_price": i["final_item_price"],
                    "applied_product_discount_id": (
                        i["applied_product_discount"].id if i.get("applied_product_discount") else None
                    ),
                }
                for i in pricing["computed_items"]
            ],
        }

    def _create_order(self, user: User, snapshot: dict) -> Order:
        """
        سفارش را از روی snapshot (فقط-ID، JSON-safe) می‌سازد.
        فقط بعد از تأیید پرداخت فراخوانی می‌شود.
        """
        address = Address.objects.filter(id=snapshot["address_id"], user=user).first()

        order = Order.objects.create(
            user=user,
            address=address,
            pickup_date=date.fromisoformat(snapshot["pickup_date"]),
            pickup_shift=snapshot["pickup_shift"],
            delivery_date=date.fromisoformat(snapshot["delivery_date"]),
            delivery_shift=snapshot["delivery_shift"],
            description=snapshot.get("description", ""),
            status=OrderStatus.PAID,
            final_price=snapshot["final_price"],
            subtotal_raw=snapshot["subtotal_raw"],
            total_item_discounts=snapshot["total_item_discounts"],
            subtotal_after_items=snapshot["subtotal_after_items"],
            order_discount_amount=snapshot["order_discount_amount"],
            pickup_cost=snapshot["pickup_cost"],
            delivery_cost=snapshot["delivery_cost"],
            rush_fee=snapshot["rush_fee"],
            percent_fee=snapshot["percent_fee"],
            applied_coupon_id=snapshot["applied_coupon_id"],
            paid_at=timezone.now(),
        )
        OrderItem.objects.bulk_create([
            OrderItem(
                order=order,
                product_id=i["product_id"],
                size_id=i["size_id"],
                pricing_tab_id=i["pricing_tab_id"],
                material=i["material_name"],
                quantity=i["quantity"],
                original_price=i["original_price"],
                item_discount=i["item_discount"],
                price=i["final_item_price"],
                applied_product_discount_id=i["applied_product_discount_id"],
            )
            for i in snapshot["computed_items"]
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
        snapshot قیمت (فقط-ID، JSON-safe) داخل gateway_request ذخیره می‌شود.
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

        snapshot = self._serialize_pricing_snapshot(pricing)

        payment = PaymentSession.objects.create(
            user=user,
            type=PaymentSession.Type.ORDER,
            amount=pricing["final_price"],
            status=PaymentSession.Status.INITIATED,
            gateway_request={"pricing_snapshot": snapshot},
        )

        create_audit_log(
            action="PAYMENT_INITIATED",
            user=user,
            payment=payment,
            new_data={"amount": payment.amount},
        )

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
    def verify_payment(self, *, authority: str, user: User = None, callback_payload: dict = None) -> dict:
        """
        Idempotent است — اگر قبلاً تأیید شده باشد همان نتیجه را برمی‌گرداند.
        :param user: اگر پاس داده شود، مالکیت تراکنش چک می‌شود (جلوگیری از IDOR).
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

                if user is not None and payment.user_id != user.id:
                    logger.warning(
                        f"Ownership mismatch on verify — authority={authority} "
                        f"owner={payment.user_id} requester={user.id}"
                    )
                    raise PermissionDenied("این تراکنش متعلق به شما نیست.")

                if payment.is_verified:
                    return {
                        "success":  True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id":   payment.ref_id,
                    }

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

                payment.refresh_from_db()
                if payment.is_verified:
                    return {
                        "success":  True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id":   payment.ref_id,
                    }

                payment.ref_id = verify_result["ref_id"]
                payment.card_pan = verify_result.get("card_pan", "")
                payment.status = PaymentSession.Status.PAID
                payment.is_verified = True
                payment.paid_at = timezone.now()
                payment.verified_at = timezone.now()

                if not payment.order_id:
                    snapshot = payment.gateway_request.get("pricing_snapshot")
                    order = self._create_order(payment.user, snapshot)
                    payment.order = order

                payment.save()

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
    # 3. WITHDRAW TO BANK
    # ------------------------------------------------------------------
    @transaction.atomic
    def withdraw_to_bank(self, *, user: User, amount: int, iban: str, account_holder: str) -> dict:
        self._check_withdrawal_eligibility(user)
        check_payment_cooldown(user.id, "withdraw")

        wallet = Wallet.objects.select_for_update().get(user=user, is_active=True)

        if wallet.available_balance < amount:
            record_payment_failure(user.id, "withdraw")
            raise ValidationError("موجودی کافی نیست.")

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

        return {
            "success":       True,
            "withdrawal_id": str(withdrawal.uuid),
            "message":       "درخواست برداشت ثبت شد و در صف پردازش قرار گرفت.",
        }

    def _check_withdrawal_eligibility(self, user: User) -> None:
        wallet = getattr(user, "wallet", None)
        if not wallet or not wallet.is_active:
            wallet = Wallet.objects.create(user=user, is_active=True)
        if wallet.withdraw_blocked_util and timezone.now() < wallet.withdraw_blocked_util:
            remaining_hours = (wallet.withdraw_blocked_util - timezone.now()).total_seconds() / 3600
            raise ValidationError(f"برداشت تا {remaining_hours:.1f} ساعت دیگر امکان‌پذیر نیست.")