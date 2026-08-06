import hashlib
import logging
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from time import perf_counter
from typing import Optional

from django.conf import settings
from django.utils import timezone
from django.db import transaction, IntegrityError, connection, OperationalError
from rest_framework.exceptions import PermissionDenied, ValidationError

from order.models import Order, OrderItem, OrderStatus, OrderStatusLog
from order.cart_serializer import *
from order.serializers import *
from users.models import User, Address
from ..models.models import PaymentSession, Wallet, WalletTransaction, WithdrawalRequest
from ..monitoring.monoitoring.metric import *
from ..monitoring.monoitoring.telemetry import *
from ..utils.lock_utils import DistributedLock
from ..utils.utils import *
from .service_helper import create_audit_log

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------------------
# CONSTANTS & CONFIG
# ------------------------------------------------------------------------------
_PAYMENT_SESSION_EXPIRY_MINUTES = 30
_LOCK_TIMEOUT_SECONDS = 60
_LOCK_BLOCKING_SECONDS = 5
_MAX_SNAPSHOT_JSON_SIZE = 50 * 1024
_MAX_IBAN_LENGTH = 34
_MAX_IDEMPOTENCY_KEY_LENGTH = 64

_VALID_STATUS_TRANSITIONS = {
    PaymentSession.Status.INITIATED: {
        PaymentSession.Status.PENDING,
        PaymentSession.Status.FAILED,
        PaymentSession.Status.EXPIRED,
    },
    PaymentSession.Status.PENDING: {
        PaymentSession.Status.PAID,
        PaymentSession.Status.FAILED,
        PaymentSession.Status.EXPIRED,
    },
    PaymentSession.Status.PAID: set(),
    PaymentSession.Status.FAILED: set(),
    PaymentSession.Status.EXPIRED: set(),
}


# ------------------------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------------------------
def _get_client_ip(request) -> Optional[str]:
    """Extract real client IP behind reverse proxies safely."""
    trusted_proxy_count = getattr(settings, "TRUSTED_PROXY_COUNT", 1)
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ips = [ip.strip() for ip in x_forwarded_for.split(",")]
        if len(ips) >= trusted_proxy_count:
            ip = ips[-trusted_proxy_count]
            if re.match(r"^[0-9a-fA-F.:]+$", ip):
                return ip
    return request.META.get("REMOTE_ADDR")


def _validate_status_transition(current_status: str, new_status: str) -> None:
    valid_next = _VALID_STATUS_TRANSITIONS.get(current_status, set())
    if new_status not in valid_next:
        raise ValidationError(
            f"Invalid status transition from {current_status} to {new_status}."
        )


def _sanitize_iban(iban: str) -> str:
    return iban.upper().replace(" ", "").replace("-", "")


def _validate_iban(iban: str) -> None:
    cleaned = _sanitize_iban(iban)
    if not cleaned:
        raise ValidationError("IBAN is required.")
    if len(cleaned) < 15 or len(cleaned) > _MAX_IBAN_LENGTH:
        raise ValidationError("IBAN length is invalid.")

    # Proper IBAN mod-97 validation
    rearranged = cleaned[4:] + cleaned[:4]
    converted = ''.join(str(int(ch, 36)) if ch.isalpha() else ch for ch in rearranged)
    try:
        if int(converted) % 97 != 1:
            raise ValidationError("IBAN check digits are invalid.")
    except ValueError:
        raise ValidationError("IBAN contains invalid characters.")


def _mask_card_pan(pan: Optional[str]) -> str:
    if not pan:
        return ""
    pan = pan.replace(" ", "").replace("-", "")
    if len(pan) >= 4:
        return "*" * (len(pan) - 4) + pan[-4:]
    return "*" * len(pan)


def _clamp_json_size(data: dict, max_size: int = _MAX_SNAPSHOT_JSON_SIZE) -> dict:
    import json
    serialized = json.dumps(data, default=str)
    if len(serialized) <= max_size:
        return data

    def truncate(obj, max_len=1024):
        if isinstance(obj, str) and len(obj) > max_len:
            return obj[:max_len] + "...[TRUNCATED]"
        if isinstance(obj, list) and len(obj) > 50:
            return obj[:50] + [f"...({len(obj)} total items)"]
        if isinstance(obj, dict):
            return {k: truncate(v) for k, v in obj.items()}
        return obj

    truncated = truncate(data)
    while len(json.dumps(truncated, default=str)) > max_size and isinstance(truncated, dict):
        largest_key = max(truncated.keys(), key=lambda k: len(json.dumps(truncated[k], default=str)))
        truncated[largest_key] = "[REMOVED_FOR_SIZE]"

    return truncated


def _validate_idempotency_key(key: Optional[str]) -> None:
    if key is None:
        return
    if len(key) > _MAX_IDEMPOTENCY_KEY_LENGTH:
        raise ValidationError("Idempotency key too long.")
    if not re.match(r"^[a-zA-Z0-9_-]+$", key):
        raise ValidationError("Invalid idempotency key format.")


def _sanitize_callback_payload(payload: dict, max_depth: int = 3, max_size: int = 4096) -> dict:
    import json
    if not isinstance(payload, dict):
        return {}

    def _clean(obj, depth: int):
        if depth > max_depth:
            return "[MAX_DEPTH_EXCEEDED]"
        if isinstance(obj, dict):
            return {
                str(k)[:64]: _clean(v, depth + 1)
                for k, v in obj.items()
                if isinstance(k, (str, int)) and str(k) not in {"__proto__", "constructor", "prototype"}
            }
        elif isinstance(obj, list):
            return [_clean(v, depth + 1) for v in obj[:50]]
        elif isinstance(obj, (str, int, float, bool)) or obj is None:
            if isinstance(obj, str) and len(obj) > 1024:
                return obj[:1024] + "[TRUNCATED]"
            return obj
        else:
            return str(obj)[:256]

    cleaned = _clean(payload, 0)
    serialized = json.dumps(cleaned)
    if len(serialized) > max_size:
        return {"error": "payload_too_large"}
    return cleaned


def _to_gateway_amount(amount: Decimal) -> int:
    """
    Convert a Decimal amount to gateway-compatible integer (rials).

    Strategy: quantize to zero decimal places using ROUND_HALF_UP,
    then cast to int. This ensures consistent rounding behavior
    across all gateway interactions.
    """
    return int(amount.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class PaymentService:

    def __init__(self, zarinpal_client):
        self.gateway = zarinpal_client

    # ------------------------------------------------------------------
    # PRIVATE HELPERS
    # ------------------------------------------------------------------
    def _serialize_pricing_snapshot(self, pricing: dict) -> dict:
        required_keys = ["address", "pickup_template", "delivery_template", 
                        "computed_items", "final_price", "subtotal_raw",
                        "total_item_discounts", "subtotal_after_items",
                        "order_discount_amount", "pickup_cost", "delivery_cost",
                        "rush_fee", "percent_fee", "pickup_date", "pickup_shift",
                        "delivery_date", "delivery_shift"]
        for key in required_keys:
            if key not in pricing:
                raise ValidationError(f"Missing required pricing key: {key}")

        # FIX-9: Validate object types before accessing attributes
        address = pricing["address"]
        if not hasattr(address, "id"):
            raise ValidationError("Invalid address object in pricing data.")

        pickup_template = pricing["pickup_template"]
        if not hasattr(pickup_template, "id"):
            raise ValidationError("Invalid pickup_template object in pricing data.")

        delivery_template = pricing["delivery_template"]
        if not hasattr(delivery_template, "id"):
            raise ValidationError("Invalid delivery_template object in pricing data.")

        applied_coupon = pricing.get("applied_coupon")
        if applied_coupon is not None and not hasattr(applied_coupon, "id"):
            raise ValidationError("Invalid applied_coupon object in pricing data.")

        computed_items = pricing["computed_items"]
        if not isinstance(computed_items, list):
            raise ValidationError("computed_items must be a list.")

        validated_items = []
        for idx, i in enumerate(computed_items):
            if not isinstance(i, dict):
                raise ValidationError(f"computed_items[{idx}] must be a dict.")

            product = i.get("product")
            if product is None or not hasattr(product, "id"):
                raise ValidationError(f"computed_items[{idx}]: invalid product object.")

            pricing_tab = i.get("pricing_tab")
            if pricing_tab is None or not hasattr(pricing_tab, "id"):
                raise ValidationError(f"computed_items[{idx}]: invalid pricing_tab object.")

            size = i.get("size")
            if size is not None and not hasattr(size, "id"):
                raise ValidationError(f"computed_items[{idx}]: invalid size object.")

            applied_product_discount = i.get("applied_product_discount")
            if applied_product_discount is not None and not hasattr(applied_product_discount, "id"):
                raise ValidationError(f"computed_items[{idx}]: invalid applied_product_discount object.")

            # Validate required scalar fields
            for scalar_key in ["material_name", "quantity", "original_price", "item_discount", "final_item_price"]:
                if scalar_key not in i:
                    raise ValidationError(f"computed_items[{idx}]: missing '{scalar_key}'.")

            validated_items.append({
                "product_id": product.id,
                "pricing_tab_id": pricing_tab.id,
                "size_id": size.id if size else None,
                "material_name": i["material_name"],
                "quantity": i["quantity"],
                "original_price": str(i["original_price"]),
                "item_discount": str(i["item_discount"]),
                "final_item_price": str(i["final_item_price"]),
                "applied_product_discount_id": (
                    applied_product_discount.id if applied_product_discount else None
                ),
            })

        snapshot = {
            "address_id": address.id,
            "address_data": {  # Snapshot for recovery if address deleted
                "province": getattr(address, "province", ""),
                "city": getattr(address, "city", ""),
                "street": getattr(address, "street", ""),
                "postal_code": getattr(address, "postal_code", ""),
            },
            "pickup_template_id": pickup_template.id,
            "delivery_template_id": delivery_template.id,
            "applied_coupon_id": applied_coupon.id if applied_coupon else None,
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
            "computed_items": validated_items,
        }
        return snapshot

    def _get_system_user(self) -> User:
        system_user_id = getattr(settings, "SYSTEM_USER_ID", None)
        if not system_user_id:
            logger.error("SYSTEM_USER_ID not configured in settings")
            raise ValidationError("System configuration error. Please contact support.")
        try:
            user = User.objects.get(id=system_user_id, is_active=True)
            if not user.is_staff:
                logger.error("System user lacks staff status", extra={"system_user_id": system_user_id})
                raise ValidationError("System configuration error. Please contact support.")
            return user
        except User.DoesNotExist:
            logger.error("System user not found or inactive", extra={"system_user_id": system_user_id})
            raise ValidationError("System configuration error. Please contact support.")

    @transaction.atomic
    def _create_order(self, user: User, snapshot: dict) -> Order:
        address = Address.objects.filter(id=snapshot["address_id"], user=user).first()
        if not address:
            logger.error(
                "Order creation failed: address not found after payment",
                extra={"address_id": snapshot.get("address_id"), "user_id": user.id},
            )
            raise ValidationError(
                "Address was removed after payment started. Please contact support for refund."
            )

        try:
            final_price = Decimal(str(snapshot["final_price"]))
            subtotal_raw = Decimal(str(snapshot["subtotal_raw"]))
            total_item_discounts = Decimal(str(snapshot["total_item_discounts"]))
            subtotal_after_items = Decimal(str(snapshot["subtotal_after_items"]))
            order_discount_amount = Decimal(str(snapshot["order_discount_amount"]))
            pickup_cost = Decimal(str(snapshot["pickup_cost"]))
            delivery_cost = Decimal(str(snapshot["delivery_cost"]))
            rush_fee = Decimal(str(snapshot["rush_fee"]))
            percent_fee = Decimal(str(snapshot["percent_fee"]))
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

        # Idempotency: prevent duplicate items
        if OrderItem.objects.filter(order=order).exists():
            logger.warning("OrderItems already exist for order", extra={"order_id": order.id})
            return order

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
    def initiate_payment(
        self,
        user: User,
        validated_data: dict,
        request,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        if not getattr(user, "is_active", True):
            raise PermissionDenied("User account is not active.")

        _validate_idempotency_key(idempotency_key)
        PAYMENT_TOTAL.inc()
        check_payment_cooldown(user.id, "gateway_pay")

        # Phase 1: Check idempotency and create session (atomic)
        with transaction.atomic():
            if idempotency_key:
                existing = PaymentSession.objects.filter(
                    user=user,
                    idempotency_key=idempotency_key,
                    created_at__gte=timezone.now() - timedelta(hours=24),
                    status__in=[PaymentSession.Status.INITIATED, PaymentSession.Status.PENDING],
                ).first()

                if existing:
                    # FIX-8: Validate expiration of idempotent sessions
                    if existing.expire_at and timezone.now() > existing.expire_at:
                        _validate_status_transition(existing.status, PaymentSession.Status.EXPIRED)
                        existing.status = PaymentSession.Status.EXPIRED
                        existing.save(update_fields=["status"])
                        logger.info(
                            "Idempotent session expired, creating fresh session",
                            extra={
                                "payment_id": existing.id,
                                "idempotency_key": idempotency_key,
                            },
                        )
                        # Fall through to create a fresh session below
                    else:
                        logger.info(
                            "Returning existing payment session for idempotency key",
                            extra={
                                "payment_id": existing.id,
                                "idempotency_key": idempotency_key,
                            },
                        )
                        return {
                            "payment_url": existing.gateway_response.get("payment_url", ""),
                            "authority": existing.authority,
                            "payment_uuid": str(existing.uuid),
                        }

            serializer = OrderCreateSerializer(data=validated_data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            pricing = serializer.save()

            if not pricing.get("computed_items"):
                PAYMENT_FAILED.inc()
                record_payment_failure(user.id, "gateway_pay")
                raise ValidationError("سبد خرید خالی است")

            snapshot = self._serialize_pricing_snapshot(pricing)

            try:
                amount = Decimal(str(pricing["final_price"]))
            except (InvalidOperation, TypeError):
                raise ValidationError("Invalid final price.")
            if amount <= 0:
                raise ValidationError("Amount must be greater than zero.")

            # FIX-6: Use _to_gateway_amount for consistent conversion
            amount_rials = _to_gateway_amount(amount)
            if amount_rials <= 0:
                raise ValidationError("Invalid amount for gateway.")

            expire_at = timezone.now() + timedelta(minutes=_PAYMENT_SESSION_EXPIRY_MINUTES)

            gateway_request_data = {"pricing_snapshot": snapshot}
            if idempotency_key:
                gateway_request_data["idempotency_key"] = idempotency_key

            gateway_request_data = _clamp_json_size(gateway_request_data)

            if idempotency_key:
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
                    # FIX-6: Use _to_gateway_amount for comparison
                    if _to_gateway_amount(Decimal(str(payment.amount))) != amount_rials:
                        logger.error("Idempotency key collision with different amount")
                        raise ValidationError("Payment session conflict. Please retry.")
                    return {
                        "payment_url": payment.gateway_response.get("payment_url", ""),
                        "authority": payment.authority,
                        "payment_uuid": str(payment.uuid),
                    }
            else:
                payment = PaymentSession.objects.create(
                    user=user,
                    type=PaymentSession.Type.ORDER,
                    amount=amount,
                    status=PaymentSession.Status.INITIATED,
                    expire_at=expire_at,
                    gateway_request=gateway_request_data,
                    idempotency_key=None,
                )

            create_audit_log(
                action="PAYMENT_INITIATED",
                user=user,
                payment=payment,
                new_data={"amount": str(payment.amount)},
            )

        # Phase 2: Call gateway (NO transaction)
        t0 = perf_counter()
        logger.info(
            "Payment initiated",
            extra={
                "user_id": user.id,
                "payment_id": payment.id,
                "amount": str(payment.amount),
            },
        )

        description = "پرداخت سفارش خشکشویی"
        phone = getattr(user, "phone", None)

        result = self.gateway.request_payment(
            amount=amount_rials,
            description=description,
            mobile=phone,
        )
        GATEWAY_REQUEST_DURATION.observe(perf_counter() - t0)

        # Phase 3: Update session (atomic)
        with transaction.atomic():
            payment = PaymentSession.objects.select_for_update().get(id=payment.id)

            if not result.get("success"):
                PAYMENT_FAILED.inc()
                record_payment_failure(user.id, "gateway_pay")
                _validate_status_transition(payment.status, PaymentSession.Status.FAILED)
                payment.status = PaymentSession.Status.FAILED
                payment.fail_reason = result.get("error", "gateway error")
                # FIX-7: Save gateway response on failures
                payment.gateway_response = _clamp_json_size(result)
                payment.save(update_fields=["status", "fail_reason", "gateway_response"])
                raise ValidationError(result.get("error", "Gateway error"))

            authority = result.get("authority")
            if not authority:
                logger.error("Gateway returned success but no authority", extra={"payment_id": payment.id})
                PAYMENT_FAILED.inc()
                record_payment_failure(user.id, "gateway_pay")
                _validate_status_transition(payment.status, PaymentSession.Status.FAILED)
                payment.status = PaymentSession.Status.FAILED
                payment.fail_reason = "gateway returned empty authority"
                # FIX-7: Save gateway response on empty authority failure
                payment.gateway_response = _clamp_json_size(result)
                payment.save(update_fields=["status", "fail_reason", "gateway_response"])
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
        if not authority or not isinstance(authority, str):
            raise ValidationError("Invalid authority.")
        if len(authority) > 64 or not re.match(r"^[A-Za-z0-9_-]+$", authority):
            raise ValidationError("Invalid authority format.")

        callback_payload = _sanitize_callback_payload(callback_payload or {})

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

        # ------------------------------------------------------------------
        # Phase A: Load and validate payment under lock, then release
        # ------------------------------------------------------------------
        payment_id = None
        try:
            with transaction.atomic():
                # FIX-1: Use stable deterministic hash for advisory lock
                lock_id = (
                    int(hashlib.sha256(authority.encode("utf-8")).hexdigest()[:16], 16)
                    % (2**31)
                )
                # Database advisory lock as primary (PostgreSQL)
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])

                # FIX-2: Use nowait=True to prevent indefinite waiting
                try:
                    payment = (
                        PaymentSession.objects
                        .select_for_update(nowait=True)
                        .filter(authority=authority)
                        .first()
                    )
                except OperationalError:
                    logger.warning(
                        "Payment verification row lock contention",
                        extra={"authority": authority, "user_id": getattr(user, "id", None)},
                    )
                    raise ValidationError(
                        "Payment verification is already in progress. Please wait."
                    )

                if not payment:
                    logger.warning(
                        "Verify called with unknown authority",
                        extra={"authority": authority},
                    )
                    raise ValidationError("تراکنش یافت نشد.")

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

                # FIX-11: Check both status and is_verified for consistency
                if payment.status == PaymentSession.Status.PAID and payment.is_verified:
                    return {
                        "success": True,
                        "verified": True,
                        "order_id": payment.order_id,
                        "ref_id": payment.ref_id,
                    }

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

                if payment.status in (
                    PaymentSession.Status.CANCELED,
                    PaymentSession.Status.EXPIRED,
                    PaymentSession.Status.FAILED,
                ):
                    raise ValidationError("Payment session is not active.")

                if payment.amount <= 0:
                    raise ValidationError("Invalid payment amount.")

                # Rate limit check before gateway call
                check_payment_cooldown(payment.user_id, "gateway_verify")

                # Capture data needed for Phase B and C
                payment_id = payment.id
                payment_amount = payment.amount
                payment_user = payment.user
                payment_user_id = payment.user_id
                payment_status = payment.status
                payment_order_id = payment.order_id
                payment_type = payment.type
                gateway_request = payment.gateway_request

        finally:
            # Distributed lock is held for the entire operation, released at the end
            pass

        # ------------------------------------------------------------------
        # Phase B: Call gateway outside of any database transaction
        # ------------------------------------------------------------------
        t0 = perf_counter()
        verify_result = self.gateway.verify_payment(
            authority=authority,
            amount=_to_gateway_amount(Decimal(str(payment_amount))),
        )
        VERIFY_DURATION.observe(perf_counter() - t0)

        # Verify gateway response signature if available
        expected_signature = verify_result.pop("_signature", None)
        if expected_signature and hasattr(self.gateway, 'verify_signature'):
            if not self.gateway.verify_signature(verify_result, expected_signature):
                logger.critical("Gateway signature verification failed", extra={
                    "payment_id": payment_id, "authority": authority
                })
                raise ValidationError("Gateway response integrity check failed.")

        # ------------------------------------------------------------------
        # Phase C: Re-acquire lock, revalidate, and apply verification result
        # ------------------------------------------------------------------
        try:
            with transaction.atomic():
                # Re-acquire advisory lock
                lock_id = (
                    int(hashlib.sha256(authority.encode("utf-8")).hexdigest()[:16], 16)
                    % (2**31)
                )
                with connection.cursor() as cursor:
                    cursor.execute("SELECT pg_advisory_xact_lock(%s)", [lock_id])

                try:
                    payment = (
                        PaymentSession.objects
                        .select_for_update(nowait=True)
                        .get(id=payment_id)
                    )
                except OperationalError:
                    logger.warning(
                        "Payment verification row lock contention (Phase C)",
                        extra={"authority": authority, "user_id": payment_user_id},
                    )
                    raise ValidationError(
                        "Payment verification is already in progress. Please wait."
                    )

                # Re-validate status hasn't changed
                if payment.status in (
                    PaymentSession.Status.CANCELED,
                    PaymentSession.Status.EXPIRED,
                    PaymentSession.Status.FAILED,
                    PaymentSession.Status.PAID,
                ):
                    if payment.status == PaymentSession.Status.PAID and payment.is_verified:
                        return {
                            "success": True,
                            "verified": True,
                            "order_id": payment.order_id,
                            "ref_id": payment.ref_id,
                        }
                    raise ValidationError("Payment session is no longer active.")

                payment.verify_response = _clamp_json_size(verify_result)
                payment.callback_payload = callback_payload

                if not verify_result.get("success"):
                    PAYMENT_FAILED.inc()
                    record_payment_failure(payment_user_id, "gateway_verify")
                    _validate_status_transition(payment.status, PaymentSession.Status.FAILED)
                    payment.status = PaymentSession.Status.FAILED
                    payment.fail_reason = verify_result.get("error", "verify failed")
                    payment.save(update_fields=["status", "verify_response", "fail_reason"])
                    create_audit_log(
                        action="PAYMENT_FAILED",
                        user=payment_user,
                        payment=payment,
                        new_data={"status": payment.status, "error": payment.fail_reason},
                    )
                    return {"success": False, "error": verify_result.get("error", "Verification failed.")}

                ref_id = verify_result.get("ref_id")
                if not ref_id:
                    logger.error(
                        "Gateway verify success but no ref_id",
                        extra={"payment_id": payment.id, "authority": authority},
                    )
                    raise ValidationError("Gateway returned invalid reference ID.")

                # FIX-10: Verify gateway amount matches payment amount
                gateway_amount = verify_result.get("amount")
                if gateway_amount is not None:
                    expected_amount = _to_gateway_amount(Decimal(str(payment.amount)))
                    try:
                        gateway_amount_int = int(gateway_amount)
                    except (ValueError, TypeError):
                        logger.critical(
                            "Gateway returned non-integer amount",
                            extra={
                                "payment_id": payment.id,
                                "authority": authority,
                                "gateway_amount": str(gateway_amount),
                            },
                        )
                        raise ValidationError("Gateway returned invalid amount format.")

                    if gateway_amount_int != expected_amount:
                        logger.critical(
                            "Gateway amount mismatch",
                            extra={
                                "payment_id": payment.id,
                                "authority": authority,
                                "expected_amount": expected_amount,
                                "gateway_amount": gateway_amount_int,
                            },
                        )
                        raise ValidationError("Gateway amount verification failed.")

                _validate_status_transition(payment.status, PaymentSession.Status.PAID)

                # FIX-12: Defensive order creation - verify order_id is still empty
                if not payment.order_id and payment.type == PaymentSession.Type.ORDER:
                    # Re-check under lock that order is still not created
                    payment.refresh_from_db(fields=["order_id"])
                    if payment.order_id:
                        logger.warning(
                            "Order was created concurrently",
                            extra={"payment_id": payment.id, "order_id": payment.order_id},
                        )
                    else:
                        snapshot = (payment.gateway_request or {}).get("pricing_snapshot")
                        if not snapshot:
                            logger.error(
                                "Pricing snapshot missing for payment",
                                extra={"payment_id": payment.id},
                            )
                            raise ValidationError("Pricing snapshot not found.")

                        try:
                            snapshot_amount = Decimal(str(snapshot["final_price"]))
                            payment_amount = Decimal(str(payment.amount))
                        except (InvalidOperation, KeyError, TypeError) as exc:
                            logger.error(
                                "Amount comparison failed: invalid format",
                                extra={"error": str(exc), "payment_id": payment.id},
                            )
                            raise ValidationError("Amount mismatch: invalid format.")

                        # FIX-6: Use _to_gateway_amount for comparison
                        if _to_gateway_amount(snapshot_amount) != _to_gateway_amount(payment_amount):
                            logger.error(
                                "Amount mismatch detected",
                                extra={
                                    "payment_id": payment.id,
                                    "snapshot_amount": str(snapshot_amount),
                                    "payment_amount": str(payment_amount),
                                },
                            )
                            raise ValidationError("Amount mismatch detected.")

                        order = self._create_order(payment.user, snapshot)
                        payment.order = order

                # SINGLE SAVE for all payment fields
                payment.ref_id = ref_id
                payment.card_pan = _mask_card_pan(verify_result.get("card_pan"))
                payment.status = PaymentSession.Status.PAID
                payment.is_verified = True
                payment.paid_at = timezone.now()
                payment.verified_at = timezone.now()

                # FIX: Persist verify_response and callback_payload
                payment.save(update_fields=[
                    "ref_id", "card_pan", "status", "is_verified",
                    "paid_at", "verified_at", "order",
                    "verify_response", "callback_payload",
                ])

                # FIX-3: Race-safe wallet get_or_create with row locking
                try:
                    wallet = Wallet.objects.select_for_update().get(user=payment.user)
                except Wallet.DoesNotExist:
                    try:
                        wallet = Wallet.objects.create(
                            user=payment.user,
                            is_active=True,
                        )
                        logger.info("Wallet auto-created for user", extra={"user_id": payment.user.id})
                        create_audit_log(action="WALLET_CREATED", user=payment.user, new_data={"auto": True})
                    except IntegrityError:
                        wallet = Wallet.objects.select_for_update().get(user=payment.user)

                # FIX-5: Only ignore duplicate WalletTransaction, re-raise unexpected IntegrityErrors
                try:
                    WalletTransaction.objects.create(
                        payment_session=payment,
                        transaction_type=WalletTransaction.Type.PAYMENT,
                        wallet=wallet,
                        order=payment.order,
                        amount=payment.amount,
                        status=WalletTransaction.Status.SUCCESS,
                        description=f"پرداخت سفارش #{payment.order_id}",
                    )
                except IntegrityError as exc:
                    # Check if this is a duplicate transaction (unique constraint on payment_session)
                    if WalletTransaction.objects.filter(payment_session=payment).exists():
                        logger.warning(
                            "WalletTransaction already exists for payment",
                            extra={"payment_id": payment.id},
                        )
                    else:
                        logger.critical(
                            "Unexpected IntegrityError creating WalletTransaction",
                            extra={
                                "payment_id": payment.id,
                                "error": str(exc),
                            },
                        )
                        raise

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
        client_request_id: Optional[str] = None,
    ) -> dict:
        if not getattr(user, "is_active", True):
            raise PermissionDenied("User account is not active.")

        if amount <= 0:
            raise ValidationError("Withdrawal amount must be greater than zero.")
        if amount > 999_999_999:
            raise ValidationError("Withdrawal amount exceeds maximum limit.")

        _validate_iban(iban)
        if not account_holder or len(account_holder.strip()) < 2:
            raise ValidationError("Account holder name is required.")

        # FIX-4: Removed unsafe pre-lock cooldown validation.
        # Cooldown is now checked only after wallet row lock is acquired.

        # Idempotency check (outside transaction is safe for reads)
        if client_request_id:
            existing = WithdrawalRequest.objects.filter(
                client_request_id=client_request_id,
                user=user,
            ).first()
            if existing:
                return {
                    "success": True,
                    "withdrawal_id": str(existing.uuid),
                    "message": "درخواست برداشت قبلاً ثبت شده است.",
                }

        # All wallet operations under single atomic block with lock
        with transaction.atomic():
            # FIX-3: Race-safe wallet get_or_create with row locking
            try:
                wallet = Wallet.objects.select_for_update().get(user=user)
            except Wallet.DoesNotExist:
                try:
                    wallet = Wallet.objects.create(
                        user=user,
                        is_active=True,
                    )
                    logger.info("Wallet auto-created for user", extra={"user_id": user.id})
                    create_audit_log(action="WALLET_CREATED", user=user, new_data={"auto": True})
                except IntegrityError:
                    wallet = Wallet.objects.select_for_update().get(user=user)

            if not wallet.is_active:
                raise ValidationError("Wallet is not active.")

            if wallet.withdraw_blocked_until and timezone.now() < wallet.withdraw_blocked_until:
                remaining = wallet.withdraw_blocked_until - timezone.now()
                remaining_hours = remaining.total_seconds() / 3600
                raise ValidationError(
                    f"برداشت تا {remaining_hours:.1f} ساعت دیگر امکان‌پذیر نیست."
                )

            # FIX-4: Perform cooldown validation only after wallet row lock is acquired
            check_payment_cooldown(user.id, "withdraw")

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
                client_request_id=client_request_id,
            )

            WalletTransaction.objects.create(
                wallet=wallet,
                amount=amount,
                transaction_type=WalletTransaction.Type.WITHDRAWAL,
                status=WalletTransaction.Status.PENDING,
                withdrawal_request=withdrawal,  # Requires FK addition to model
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
        """Deprecated: Logic moved into withdraw_to_bank for atomicity."""
        pass