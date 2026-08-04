import logging
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation
from time import perf_counter
from typing import Optional

from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from order.models import Order, OrderItem, OrderStatus, OrderStatusLog
from order.serializers import OrderCreateSerializer
from users.models import User, Address
from ..models.models import PaymentSession, Wallet, WalletTransaction, WithdrawalRequest
from ..monitoring.monitoring import *
from ..utils.lock_utils import DistributedLock
from ..utils.utils import *
from .service_helper import create_audit_log
from django.db import transaction, IntegrityError

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# CONSTANTS & CONFIG
# ------------------------------------------------------------------------------
_PAYMENT_SESSION_EXPIRY_MINUTES = 30
_LOCK_TIMEOUT_SECONDS = 60
_LOCK_BLOCKING_SECONDS = 5
_MAX_SNAPSHOT_JSON_SIZE = 50 * 1024  # 50KB limit for JSON fields
_MAX_IBAN_LENGTH = 34

_VALID_STATUS_TRANSITIONS = {
    PaymentSession.Status.INITIATED: {
        PaymentSession.Status.PENDING,
        PaymentSession.Status.FAILED,
        PaymentSession.Status.EXPIRED,
        PaymentSession.Status.CANCELED,
    },
    PaymentSession.Status.PENDING: {
        PaymentSession.Status.PAID,
        PaymentSession.Status.FAILED,
        PaymentSession.Status.EXPIRED,
        PaymentSession.Status.CANCELED,
    },
    PaymentSession.Status.PAID: set(),
    PaymentSession.Status.FAILED: set(),
    PaymentSession.Status.EXPIRED: set(),
    PaymentSession.Status.CANCELED: set(),
}


# ------------------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------------------
def _get_client_ip(request) -> str:
    """Extract real client IP behind reverse proxies safely."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # X-Forwarded-For: client, proxy1, proxy2
        # First IP is the client's real IP; rest are proxies
        ip = x_forwarded_for.split(",")[0].strip()
        # Basic IP validation to prevent header injection
        if re.match(r"^[0-9a-fA-F.:]+$", ip):
            return ip
    return request.META.get("REMOTE_ADDR", "")


def _validate_status_transition(current_status: str, new_status: str) -> None:
    """Raise ValidationError if status transition is invalid."""
    valid_next = _VALID_STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in valid_next:
        raise ValidationError(
            f"Invalid status transition from {current_status} to {new_status}."
        )


def _sanitize_iban(iban: str) -> str:
    """Normalize IBAN: uppercase, remove spaces."""
    return iban.upper().replace(" ", "").replace("-", "")


def _validate_iban(iban: str) -> None:
    """Validate IBAN format. Raises ValidationError if invalid."""
    cleaned = _sanitize_iban(iban)
    if not cleaned:
        raise ValidationError("IBAN is required.")
    if len(cleaned) < 15 or len(cleaned) > _MAX_IBAN_LENGTH:
        raise ValidationError("IBAN length is invalid.")
    if not re.match(r"^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$", cleaned):
        raise ValidationError("IBAN format is invalid.")


def _mask_card_pan(pan: Optional[str]) -> str:
    """Mask card PAN for safe storage. Store only last 4 digits."""
    if not pan:
        return ""
    pan = pan.replace(" ", "").replace("-", "")
    if len(pan) >= 4:
        return "****" + pan[-4:]
    return "****"


def _clamp_json_size(data: dict, max_size: int = _MAX_SNAPSHOT_JSON_SIZE) -> dict:
    """Prevent JSONField bloat by truncating oversized payloads."""
    import json
    serialized = json.dumps(data, default=str)
    if len(serialized) > max_size:
        logger.warning(
            "JSON payload exceeded size limit, truncating",
            extra={"original_size": len(serialized), "max_size": max_size},
        )
        # Return a safe minimal payload instead of the oversized one
        return {"error": "payload_too_large", "truncated": True}
    return data


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
        snapshot = {
            "address_id": pricing["address"].id,
            "pickup_template_id": pricing["pickup_template"].id,
            "delivery_template_id": pricing["delivery_template"].id,
            "applied_coupon_id": pricing["applied_coupon"].id if pricing.get("applied_coupon") else None,
            "subtotal_raw": str(pricing["subtotal_raw"]),
            "total_item_discounts": str(pricing["total_item_discounts"]),
            "subtotal_after_items": str(pricing["subtotal_after_items"]),
            "order_discount_amount": str(pricing["order_discount_amount"]),
            "pickup_cost": str(pricing["pickup_cost"]),
            "delivery_cost": str(pricing["delivery_cost"]),
            "rush_fee": str(pricing["rush_fee"]),
            "percent_fee": str(pricing["percent_fee"]),
            "final_price": str(pricing["final_price"]),
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
                    "original_price": str(i["original_price"]),
                    "item_discount": str(i["item_discount"]),
                    "final_item_price": str(i["final_item_price"]),
                    "applied_product_discount_id": (
                        i["applied_product_discount"].id if i.get("applied_product_discount") else None
                    ),
                }
                for i in pricing["computed_items"]
            ],
        }
        return snapshot

    def _get_system_user(self) -> User:
        """Return the configured system user for audit logs."""
        system_user_id = getattr(settings, "SYSTEM_USER_ID", None)
        if not system_user_id:
            logger.error("SYSTEM_USER_ID not configured in settings")
            raise ValidationError(
                "System configuration error. Please contact support."
            )
        try:
            return User.objects.get(id=system_user_id, is_active=True)
        except User.DoesNotExist:
            logger.error("System user not found or inactive", extra={"system_user_id": system_user_id})
            raise ValidationError(
                "System configuration error. Please contact support."
            )

    @transaction.atomic
    def _create_order(self, user: User, snapshot: dict) -> Order:
        """
        سفارش را از روی snapshot (فقط-ID، JSON-safe) می‌سازد.
        فقط بعد از تأیید پرداخت فراخوانی می‌شود.
        Wrapped in atomic to ensure Order + OrderItems + StatusLog are all-or-nothing.
        """
        address = Address.objects.filter(id=snapshot["address_id"], user=user).first()
        if not address:
            logger.warning(
                "Order creation failed: address not found",
                extra={"address_id": snapshot.get("address_id"), "user_id": user.id},
            )
            raise ValidationError("Address not found or no longer available.")

        # Parse Decimal values safely from string snapshot
        try:
            final_price = Decimal(snapshot["final_price"])
            subtotal_raw = Decimal(snapshot["subtotal_raw"])
            total_item_discounts = Decimal(snapshot["total_item_discounts"])
            subtotal_after_items = Decimal(snapshot["subtotal_after_items"])
            order_discount_amount = Decimal(snapshot["order_discount_amount"])
            pickup_cost = Decimal(snapshot["pickup_cost"])
            delivery_cost = Decimal(snapshot["delivery_cost"])
            rush_fee = Decimal(snapshot["rush_fee"])
            percent_fee = Decimal(snapshot["percent_fee"])
        except (InvalidOperation, KeyError, TypeError) as exc:
            logger.error(
                "Order creation failed: invalid snapshot amounts",
                extra={"error": str(exc), "user_id": user.id},
            )
            raise ValidationError("Invalid pricing snapshot: amount format error.")

        order = Order.objects.create(
            user=user,
            address=address,
            pickup_date=date.fromisoformat(snapshot["pickup_date"]),
            pickup_shift=snapshot["pickup_shift"],
            delivery_date=date.fromisoformat(snapshot["delivery_date"]),
            delivery_shift=snapshot["delivery_shift"],
            description=snapshot.get("description", ""),
            status=OrderStatus.PAID,
            final_price=final_price,
            subtotal_raw=subtotal_raw,
            total_item_discounts=total_item_discounts,
            subtotal_after_items=subtotal_after_items,
            order_discount_amount=order_discount_amount,
            pickup_cost=pickup_cost,
            delivery_cost=delivery_cost,
            rush_fee=rush_fee,
            percent_fee=percent_fee,
            applied_coupon_id=snapshot.get("applied_coupon_id"),
            paid_at=timezone.now(),
        )

        # Build OrderItems from snapshot
        order_items = []
        for item in snapshot["computed_items"]:
            try:
                order_items.append(OrderItem(
                    order=order,
                    product_id=item["product_id"],
                    size_id=item.get("size_id"),
                    pricing_tab_id=item["pricing_tab_id"],
                    material=item["material_name"],
                    quantity=item["quantity"],
                    original_price=Decimal(item["original_price"]),
                    item_discount=Decimal(item["item_discount"]),
                    price=Decimal(item["final_item_price"]),
                    applied_product_discount_id=item.get("applied_product_discount_id"),
                ))
            except (InvalidOperation, KeyError, TypeError) as exc:
                logger.error(
                    "OrderItem creation failed: invalid item data",
                    extra={"error": str(exc), "order_id": order.id, "item": item},
                )
                raise ValidationError("Invalid item data in pricing snapshot.")

        OrderItem.objects.bulk_create(order_items)

        system_user = self._get_system_user()
        OrderStatusLog.objects.create(
            order=order,
            user=system_user,
            to_status=OrderStatus.PAID,
            timestamp=timezone.now(),
        )

        logger.info(
            "Order created successfully",
            extra={
                "order_id": order.id,
                "user_id": user.id,
                "final_price": str(final_price),
            },
        )
        return order

    # ------------------------------------------------------------------
    # 1. INITIATE PAYMENT
    # ------------------------------------------------------------------
    @transaction.atomic
    def initiate_payment(
        self,
        user: User,
        validated_data: dict,
        request,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        """
        مرحله اول: اعتبارسنجی سبد، محاسبه قیمت، ساخت PaymentSession و
        دریافت لینک درگاه از زرین‌پال.

        :param idempotency_key: If provided, returns existing session for same key
        to prevent duplicate PaymentSessions on client retry.
        """
        # Validate user is active
        if not getattr(user, "is_active", True):
            raise PermissionDenied("User account is not active.")

        PAYMENT_TOTAL.inc()
        check_payment_cooldown(user.id, "gateway_pay")

            if existing:
                logger.info(
                    "Returning existing payment session for idempotency key",
                    extra={"payment_id": existing.id, "idempotency_key": idempotency_key},
                )
                return {
                    "payment_url": existing.gateway_response.get("payment_url", ""),
                    "authority": existing.authority,
                    "payment_uuid": str(existing.uuid),
                }

        # Validate and compute pricing
        serializer = OrderCreateSerializer(data=validated_data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        pricing = serializer.save()

        if not pricing.get("computed_items"):
            PAYMENT_FAILED.inc()
            record_payment_failure(user.id, "gateway_pay")
            raise ValidationError("سبد خرید خالی است")

        snapshot = self._serialize_pricing_snapshot(pricing)

        # Validate amount is positive
        try:
            amount = Decimal(str(pricing["final_price"]))
        except (InvalidOperation, TypeError):
            raise ValidationError("Invalid final price.")
        if amount <= 0:
            raise ValidationError("Amount must be greater than zero.")

        expire_at = timezone.now() + timedelta(minutes=_PAYMENT_SESSION_EXPIRY_MINUTES)

        gateway_request_data = {"pricing_snapshot": snapshot}
        if idempotency_key:
            gateway_request_data["idempotency_key"] = idempotency_key

        gateway_request_data = _clamp_json_size(gateway_request_data)

        try:
        payment = PaymentSession.objects.create(
            user=user,
            type=PaymentSession.Type.ORDER,
            amount=amount,
            status=PaymentSession.Status.INITIATED,
            expire_at=expire_at,
            gateway_request=gateway_request_data,
            idempotency_key=idempotency_key,
        )
        except IntegrityError:
            payment = PaymentSession.objects.get(
                user=user,
                idempotency_key=idempotency_key,
            )

            return {
                "payment_url": payment.gateway_response.get("payment_url", ""),
                "authority": payment.authority,
                "payment_uuid": str(payment.uuid),
            }

        create_audit_log(
            action="PAYMENT_INITIATED",
            user=user,
            payment=payment,
            new_data={"amount": str(payment.amount)},
        )

        # Call gateway
        t0 = perf_counter()
        logger.info(
            "Payment initiated",
            extra={
                "user_id": user.id,
                "payment_id": payment.id,
                "amount": str(payment.amount),
            },
        )

        # Use a generic description without PII
        description = "پرداخت سفارش خشکشویی"
        phone = getattr(user, "phone", None)

        result = self.gateway.request_payment(
            amount=int(payment.amount),
            description=description,
            mobile=phone,
        )
        GATEWAY_REQUEST_DURATION.observe(perf_counter() - t0)

        if not result.get("success"):
            PAYMENT_FAILED.inc()
            record_payment_failure(user.id, "gateway_pay")
            _validate_status_transition(payment.status, PaymentSession.Status.FAILED)
            payment.status = PaymentSession.Status.FAILED
            payment.fail_reason = result.get("error", "gateway error")
            payment.save(update_fields=["status", "fail_reason"])
            raise ValidationError(result.get("error", "Gateway error"))

        # Validate authority from gateway
        authority = result.get("authority")
        if not authority:
            logger.error("Gateway returned success but no authority", extra={"payment_id": payment.id})
            PAYMENT_FAILED.inc()
            record_payment_failure(user.id, "gateway_pay")
            _validate_status_transition(payment.status, PaymentSession.Status.FAILED)
            payment.status = PaymentSession.Status.FAILED
            payment.fail_reason = "gateway returned empty authority"
            payment.save(update_fields=["status", "fail_reason"])
            raise ValidationError("Gateway error: invalid authority.")

        _validate_status_transition(payment.status, PaymentSession.Status.PENDING)
        payment.authority = authority
        payment.gateway_response = _clamp_json_size(result)
        payment.status = PaymentSession.Status.PENDING
        payment.save(update_fields=["authority", "gateway_response", "status"])

        return {
            "payment_url": result.get("payment_url", ""),
            "authority": payment.authority,
            "payment_uuid": str(payment.uuid),
        }

    # ------------------------------------------------------------------
    # 2. VERIFY PAYMENT
    # ------------------------------------------------------------------
    def verify_payment(
        self,
        *,
        authority: str,
        user: Optional[User] = None,
        callback_payload: Optional[dict] = None,
    ) -> dict:
        """
        Idempotent — returns same result if already verified.
        Thread-safe via distributed lock + select_for_update.
        """
        if not authority or not isinstance(authority, str):
            raise ValidationError("Invalid authority.")

        # Sanitize callback payload to prevent injection
        if callback_payload is not None:
            if not isinstance(callback_payload, dict):
                callback_payload = {}
            # Remove potentially dangerous keys
            callback_payload = {
                k: v for k, v in callback_payload.items()
                if isinstance(k, str) and k not in {"__proto__", "constructor", "prototype"}
            }

        lock = None
        try:
            lock = DistributedLock(
                key=f"verify:{authority}",
                timeout=_LOCK_TIMEOUT_SECONDS,
                blocking_timeout=_LOCK_BLOCKING_SECONDS,
            )
            lock_acquired = lock.acquire(blocking=False)
            if not lock_acquired:
                logger.warning(
                    "Payment verification lock contention",
                    extra={"authority": authority, "user_id": getattr(user, "id", None)},
                )
                raise ValidationError(
                    "Payment verification is already in progress. Please wait."
                )
        except ValidationError:
            raise
        except Exception as exc:
            logger.error(
                "Failed to acquire distributed lock",
                extra={"authority": authority, "error": str(exc)},
            )
            raise ValidationError(
                "Payment verification is currently unavailable. Please try again shortly."
            )

        try:
            with transaction.atomic():
                payment = (
                    PaymentSession.objects
                    .select_for_update(nowait=False)
                    .filter(authority=authority)
                    .first()
                )
                if not payment:
                    logger.warning(
                        "Verify called with unknown authority",
                        extra={"authority": authority},
                    )
                    raise ValidationError("تراکنش یافت نشد.")

                # Ownership check BEFORE any state mutation
                if user is not None and payment.user_id != user.id:
                    logger.warning(
                        "Ownership mismatch on verify",
                        extra={
                            "authority": authority,
                            "owner_id": payment.user_id,
                            "requester_id": user.id,
                        },
                    )
                    raise PermissionDenied("این تراکنش متعلق به شما نیست.")

                # Rate limit verification attempts
                check_payment_cooldown(payment.user_id, "gateway_verify")

                # Idempotency: already verified
                if payment.is_verified:
                    return {
                        "success": True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id": payment.ref_id,
                    }

                # Expiration: only for active (non-final) statuses
                if (
                    payment.status in (
                        PaymentSession.Status.INITIATED,
                        PaymentSession.Status.PENDING,
                    )
                    and payment.expire_at
                    and timezone.now() > payment.expire_at
                ):
                    _validate_status_transition(payment.status, PaymentSession.Status.EXPIRED)
                    payment.status = PaymentSession.Status.EXPIRED
                    payment.save(update_fields=["status"])
                    logger.info(
                        "Payment session expired",
                        extra={"payment_id": payment.id, "authority": authority},
                    )
                    raise ValidationError("Payment session expired.")

                # Block verification of terminal statuses
                if payment.status in (
                    PaymentSession.Status.CANCELED,
                    PaymentSession.Status.EXPIRED,
                    PaymentSession.Status.FAILED,
                ):
                    raise ValidationError("Payment session is not active.")

                # Validate amount is positive before gateway call
                if payment.amount <= 0:
                    raise ValidationError("Invalid payment amount.")

                # Call gateway to verify
                t0 = perf_counter()
                verify_result = self.gateway.verify_payment(
                    authority=authority,
                    amount=int(payment.amount),
                )
                VERIFY_DURATION.observe(perf_counter() - t0)

                # Store verify response (sanitized)
                payment.verify_response = _clamp_json_size(verify_result)
                payment.callback_payload = _clamp_json_size(callback_payload or {})

                if not verify_result.get("success"):
                    PAYMENT_FAILED.inc()
                    record_payment_failure(payment.user_id, "gateway_verify")
                    _validate_status_transition(payment.status, PaymentSession.Status.FAILED)
                    payment.status = PaymentSession.Status.FAILED
                    payment.fail_reason = verify_result.get("error", "verify failed")
                    payment.save(update_fields=["status", "verify_response", "fail_reason"])
                    create_audit_log(
                        action="PAYMENT_FAILED",
                        user=payment.user,
                        payment=payment,
                        new_data={"status": payment.status, "error": payment.fail_reason},
                    )
                    return {"success": False, "error": verify_result.get("error", "Verification failed.")}

                # Re-check idempotency after gateway call (another worker may have won)
                payment.refresh_from_db()
                if payment.is_verified:
                    return {
                        "success": True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id": payment.ref_id,
                    }

                # Validate ref_id from gateway
                ref_id = verify_result.get("ref_id")
                if not ref_id:
                    logger.error(
                        "Gateway verify success but no ref_id",
                        extra={"payment_id": payment.id, "authority": authority},
                    )
                    raise ValidationError("Gateway returned invalid reference ID.")

                # Update payment to PAID
                _validate_status_transition(payment.status, PaymentSession.Status.PAID)
                payment.ref_id = ref_id
                payment.card_pan = _mask_card_pan(verify_result.get("card_pan"))
                payment.status = PaymentSession.Status.PAID
                payment.is_verified = True
                payment.paid_at = timezone.now()
                payment.verified_at = timezone.now()

                # Create order if not already linked
                if not payment.order_id:
                    snapshot = (payment.gateway_request or {}).get("pricing_snapshot")
                    if not snapshot:
                        logger.error(
                            "Pricing snapshot missing for payment",
                            extra={"payment_id": payment.id},
                        )
                        raise ValidationError("Pricing snapshot not found.")

                    # Type-safe amount comparison using Decimal
                    try:
                        snapshot_amount = Decimal(str(snapshot["final_price"]))
                        payment_amount = Decimal(str(payment.amount))
                    except (InvalidOperation, KeyError, TypeError) as exc:
                        logger.error(
                            "Amount comparison failed: invalid format",
                            extra={"error": str(exc), "payment_id": payment.id},
                        )
                        raise ValidationError("Amount mismatch: invalid format.")

                    if snapshot_amount != payment_amount:
                        logger.error(
                            "Amount mismatch detected",
                            extra={
                                "payment_id": payment.id,
                                "snapshot_amount": str(snapshot_amount),
                                "payment_amount": str(payment_amount),
                            },
                        )
                        raise ValidationError("Amount mismatch detected.")

                    # Create order (already wrapped in transaction.atomic by caller)
                    order = self._create_order(payment.user, snapshot)
                    payment.order = order
                    # CRITICAL: Persist order link immediately to prevent duplicate order on retry
                    payment.save(update_fields=["order"])

                # Persist all payment fields atomically
                payment.save(update_fields=[
                    "ref_id", "card_pan", "status", "is_verified",
                    "paid_at", "verified_at", "order",
                ])

                # Wallet transaction — get_or_create with unique constraint protection
                wallet, _ = Wallet.objects.get_or_create(
                    user=payment.user,
                    defaults={"is_active": True},
                )
                WalletTransaction.objects.get_or_create(
                    payment_session=payment,
                    transaction_type=WalletTransaction.Type.PAYMENT,
                    defaults={
                        "wallet": wallet,
                        "order": payment.order,
                        "amount": payment.amount,
                        "status": WalletTransaction.Status.SUCCESS,
                        "description": f"پرداخت سفارش #{payment.order_id}",
                    },
                )

                PAYMENT_SUCCESS.inc()
                reset_payment_cooldown(payment.user_id, "gateway_pay")
                create_audit_log(
                    action="PAYMENT_VERIFIED",
                    user=payment.user,
                    payment=payment,
                    new_data={
                        "ref_id": payment.ref_id,
                        "order_id": payment.order_id,
                        "amount": str(payment.amount),
                    },
                )

                logger.info(
                    "Payment verified successfully",
                    extra={
                        "payment_id": payment.id,
                        "order_id": payment.order_id,
                        "ref_id": payment.ref_id,
                        "user_id": payment.user_id,
                        "amount": str(payment.amount),
                    },
                )

                return {
                    "success": True,
                    "order_id": payment.order_id,
                    "ref_id": payment.ref_id,
                }
        finally:
            if lock is not None:
                try:
                    lock.release()
                except Exception:
                    pass

    # ------------------------------------------------------------------
    # 3. WITHDRAW TO BANK
    # ------------------------------------------------------------------
    @transaction.atomic
    def withdraw_to_bank(
        self,
        *,
        user: User,
        amount: int,
        iban: str,
        account_holder: str,
    ) -> dict:
        """Request withdrawal from wallet to bank account."""
        # Validate user
        if not getattr(user, "is_active", True):
            raise PermissionDenied("User account is not active.")

        # Validate inputs
        if amount <= 0:
            raise ValidationError("Withdrawal amount must be greater than zero.")
        if amount > 999_999_999:  # Sanity cap
            raise ValidationError("Withdrawal amount exceeds maximum limit.")

        _validate_iban(iban)
        if not account_holder or len(account_holder.strip()) < 2:
            raise ValidationError("Account holder name is required.")

        # Check eligibility (includes wallet creation if needed)
        self._check_withdrawal_eligibility(user)
        check_payment_cooldown(user.id, "withdraw")

        # Lock wallet for update
        wallet = Wallet.objects.select_for_update().get(user=user, is_active=True)

        if wallet.available_balance < amount:
            record_payment_failure(user.id, "withdraw")
            raise ValidationError("موجودی کافی نیست.")

        wallet.available_balance -= amount
        wallet.locked_balance += amount
        wallet.save(update_fields=["available_balance", "locked_balance"])

        withdrawal = WithdrawalRequest.objects.create(
            user=user,
            wallet=wallet,
            amount=amount,
            iban=_sanitize_iban(iban),
            account_holder=account_holder.strip(),
            status=WithdrawalRequest.Status.PENDING,
        )

        WalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type=WalletTransaction.Type.WITHDRAWAL,
            status=WalletTransaction.Status.PENDING,
            description=f"درخواست برداشت #{withdrawal.id} — {_sanitize_iban(iban)[:8]}...",
        )

        create_audit_log(
            action="WITHDRAWAL_REQUESTED",
            user=user,
            new_data={
                "amount": amount,
                "iban": _sanitize_iban(iban),
                "withdrawal_id": withdrawal.id,
            },
        )

        logger.info(
            "Withdrawal requested",
            extra={
                "user_id": user.id,
                "withdrawal_id": withdrawal.id,
                "amount": amount,
            },
        )

        return {
            "success": True,
            "withdrawal_id": str(withdrawal.uuid),
            "message": "درخواست برداشت ثبت شد و در صف پردازش قرار گرفت.",
        }

    def _check_withdrawal_eligibility(self, user: User) -> None:
        """Check if user is eligible to withdraw. Creates wallet if needed."""
        # Use get_or_create without select_for_update since this is just a read/creation check
        wallet, created = Wallet.objects.get_or_create(
            user=user,
            defaults={"is_active": True},
        )
        if created:
            logger.info("Wallet auto-created for user", extra={"user_id": user.id})

        if not wallet.is_active:
            raise ValidationError("Wallet is not active.")

        if wallet.withdraw_blocked_util and timezone.now() < wallet.withdraw_blocked_util:
            remaining = wallet.withdraw_blocked_util - timezone.now()
            remaining_hours = remaining.total_seconds() / 3600
            raise ValidationError(
                f"برداشت تا {remaining_hours:.1f} ساعت دیگر امکان‌پذیر نیست."
            )