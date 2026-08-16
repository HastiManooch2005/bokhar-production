from django.db import transaction
from rest_framework import serializers
from django.shortcuts import get_object_or_404
from users.models import Address
from discounts.engine import DiscountEngine
from products.models import Product, ProductPricingTab, MaterialPrice, Size
from .utils import get_available_pickup_capacity, get_available_delivery_capacity
from .session import OrderSession
from .serializers import AddressSerializer
from .models import (
    FRONTEND_TIME_MAP, Order, OrderItem, OrderStatus, 
    PickUpTemplate, DeliveryTemplate, RushFeeSetting, TimeRange
)


# ============================================================
# Cart Item Payload Serializer
# ============================================================
class CartItemPayloadSerializer(serializers.Serializer):
    """
    فقط شناسه‌ها و quantity — قیمت‌ها Backend محاسبه می‌کنه
    """
    service_item_id = serializers.IntegerField(required=True, min_value=1)
    quantity = serializers.IntegerField(required=True, min_value=1, max_value=100)
    pricing_tab_id = serializers.IntegerField(required=False, allow_null=True)
    material = serializers.CharField(required=False, allow_blank=True, default="نخ")
    size = serializers.IntegerField(required=False, allow_null=True)


# ============================================================
# Raw Address Serializer (جدید — برای آدرس‌های موقت/پراکنده)
# ============================================================
class RawAddressSerializer(serializers.Serializer):
    """
    وقتی کاربر آدرس انتخاب کرده ولی هنوز سیو نکرده
    Frontend فیلدهای پراکنده می‌فرسته — اینجا wrap می‌شه
    """
    title = serializers.CharField(required=False, allow_blank=True, default="")
    province = serializers.CharField(required=False, allow_blank=True, default="تهران")
    city = serializers.CharField(required=False, allow_blank=True, default="تهران")
    district = serializers.CharField(required=False, allow_blank=True, default="")
    address_detail = serializers.CharField(required=True)
    apartment_name = serializers.CharField(required=False, allow_blank=True, default="")
    unit = serializers.IntegerField(required=False, default=1)
    postal_code = serializers.CharField(required=False, allow_blank=True, default="")
    phone = serializers.CharField(required=False, allow_blank=True, default="")
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)


# ============================================================
# OrderCreateSerializer (کامل — با پشتیبانی از آدرس پراکنده)
# ============================================================
class OrderCreateSerializer(serializers.Serializer):
    # --- آدرس (سه حالت) ---
    address_id = serializers.IntegerField(required=False, allow_null=True)
    new_address = AddressSerializer(required=False)
    raw_address = RawAddressSerializer(required=False)
    
    # --- زمان ---
    pickup_date = serializers.DateField()
    pickup_shift = serializers.CharField()
    delivery_date = serializers.DateField()
    delivery_shift = serializers.CharField()
    
    # --- سایر ---
    description = serializers.CharField(required=False, allow_blank=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    
    # --- سبد خرید ---
    cart_items = CartItemPayloadSerializer(many=True, required=False)

    def validate(self, data):
        request = self.context.get('request')
        user = request.user if request else None
        
        # پاک کردن address_id اگه null هست
        if 'address_id' in data and data['address_id'] is None:
            data.pop('address_id')
        
        # ============================================================
        # اعتبارسنجی آدرس
        # ============================================================
        has_address_id = 'address_id' in data and data['address_id'] is not None
        has_new_address = bool(data.get('new_address'))
        has_raw_address = bool(data.get('raw_address'))
        
        address_sources = sum([has_address_id, has_new_address, has_raw_address])
        
        if address_sources == 0:
            raise serializers.ValidationError({
                "address": "آدرس انتخاب یا ایجاد کنید. یکی از موارد address_id، new_address یا raw_address را ارسال کنید."
            })
        
        if address_sources > 1:
            raise serializers.ValidationError({
                "address": "فقط یکی از موارد address_id، new_address یا raw_address را ارسال کنید."
            })
        
        if has_address_id:
            try:
                Address.objects.get(id=data['address_id'], user=user)
            except Address.DoesNotExist:
                raise serializers.ValidationError({
                    "address_id": "آدرس پیدا نشد یا متعلق به شما نیست."
                })
        
        if has_raw_address:
            raw = data['raw_address']
            if not raw.get('address_detail'):
                raise serializers.ValidationError({
                    "raw_address.address_detail": "جزئیات آدرس الزامی است."
                })
        
        # ============================================================
        # اعتبارسنجی زمان
        # ============================================================
        pickup_shift = data.get('pickup_shift')
        delivery_shift = data.get('delivery_shift')
        
        if pickup_shift and pickup_shift not in dict(TimeRange.choices):
            mapped = FRONTEND_TIME_MAP.get(pickup_shift)
            if mapped:
                data['pickup_shift'] = mapped
            else:
                raise serializers.ValidationError({"pickup_shift": "شیفت نامعتبر است."})
        
        if delivery_shift and delivery_shift not in dict(TimeRange.choices):
            mapped = FRONTEND_TIME_MAP.get(delivery_shift)
            if mapped:
                data['delivery_shift'] = mapped
            else:
                raise serializers.ValidationError({"delivery_shift": "شیفت نامعتبر است."})
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        
        # ============================================================
        # ۱. سبد خرید
        # ============================================================
        cart_items_payload = validated_data.get('cart_items')
        
        if cart_items_payload:
            cart_items = self._normalize_cart_items(cart_items_payload)
        else:
            cart = OrderSession(request)
            cart_items = list(cart)
            
        if not cart_items:
            raise serializers.ValidationError("سبد خرید خالی است")

        # ============================================================
        # ۲. آدرس — سه حالت
        # ============================================================
        if 'address_id' in validated_data and validated_data['address_id'] is not None:
            address = get_object_or_404(
                Address, id=validated_data['address_id'], user=user
            )
            
        elif 'new_address' in validated_data and validated_data['new_address']:
            addr_serializer = AddressSerializer(
                data=validated_data['new_address'], 
                context=self.context
            )
            addr_serializer.is_valid(raise_exception=True)
            address = addr_serializer.save()
            
        elif 'raw_address' in validated_data and validated_data['raw_address']:
            raw = validated_data['raw_address']
            address = Address.objects.create(
                user=user,
                title=raw.get('title', ''),
                province=raw.get('province', 'تهران'),
                city=raw.get('city', 'تهران'),
                district=raw.get('district', ''),
                address_detail=raw['address_detail'],
                apartment_name=raw.get('apartment_name', ''),
                unit=raw.get('unit', 1),
                postal_code=raw.get('postal_code', ''),
                phone=raw.get('phone', ''),
                latitude=raw.get('latitude'),
                longitude=raw.get('longitude'),
            )
        else:
            raise serializers.ValidationError("آدرس نامعتبر است.")

        # ... بقیه کد create ...

        pickup_shift = validated_data['pickup_shift']
        delivery_shift = validated_data['delivery_shift']

        pickup_template = PickUpTemplate.objects.select_for_update().get(
            time_shift=pickup_shift,
            is_active=True
        )
        delivery_template = DeliveryTemplate.objects.select_for_update().get(
            time_shift=delivery_shift,
            is_active=True
        )

        temp_order = Order(
            pickup_date=validated_data['pickup_date'],
            pickup_shift=pickup_shift,
            delivery_date=validated_data['delivery_date'],
            delivery_shift=delivery_shift
        )
        
        try:
            order_type = temp_order.order_range_type()
        except ValueError as e:
            raise serializers.ValidationError({"datetime": str(e)})

        available_pickup = get_available_pickup_capacity(pickup_shift)
        available_delivery = get_available_delivery_capacity(
            order_type,
            validated_data['delivery_date'],
            delivery_shift
        )

        if available_pickup <= 0:
            raise serializers.ValidationError("ظرفیت تحویل‌گیری تکمیل است")
        if available_delivery <= 0:
            raise serializers.ValidationError("ظرفیت تحویل‌دهی تکمیل است")

        rush_fee = temp_order.calculate_rush_fee()
        percent_fee = temp_order.calculate_percent_fee()
        pickup_cost = pickup_template.base_price + pickup_template.price_add
        delivery_base = delivery_template.base_price + delivery_template.price_add

        engine = DiscountEngine(user=user)
        computed_items = []
        subtotal_raw = 0
        total_item_discounts = 0

        for item_data in cart_items:
            product = item_data.get('product') or Product.objects.get(id=item_data['product_id'])
            
            pricing_tab = item_data.get('pricing_tab')
            if not pricing_tab:
                pricing_tab_id = item_data.get('pricing_tab_id')
                if pricing_tab_id:
                    pricing_tab = ProductPricingTab.objects.get(id=pricing_tab_id)
                else:
                    pricing_tab = product.pricing_tabs.first()
                    if not pricing_tab:
                        raise serializers.ValidationError(
                            f"محصول {product.title} تب قیمت ندارد"
                        )

            material_name = item_data['material']
            size = None
            if item_data.get('size'):
                size = item_data.get('size_obj') or Size.objects.get(id=item_data['size'])

            quantity = item_data['quantity']

            material_price = MaterialPrice.objects.get(
                pricing_tab=pricing_tab,
                material=material_name
            )

            base_price = material_price.price
            
            discount_result = engine.calculate_item_price(
                base_price=base_price,
                product=product,
                material=material_price,
                pricing_tab=pricing_tab,
            )

            computed_items.append({
                "product": product,
                "pricing_tab": pricing_tab,
                "size": size,
                "material_name": material_name,
                "quantity": quantity,
                "original_price": discount_result.base_price,
                "item_discount": discount_result.base_discount_amount,
                "final_item_price": discount_result.final_price,
                "applied_product_discount": discount_result.base_discount_instance,
            })

            subtotal_raw += discount_result.base_price * quantity
            total_item_discounts += discount_result.base_discount_amount * quantity

        subtotal_after_items = subtotal_raw - total_item_discounts
        percent_amount_before_coupon = (
            (subtotal_after_items * percent_fee) // 100 if percent_fee else 0
        )
        delivery_cost_final = delivery_base

        final_price_before_coupon = max(
            0,
            subtotal_after_items + percent_amount_before_coupon + 
            pickup_cost + delivery_cost_final + rush_fee
        )

        coupon_code = validated_data.get('coupon_code')
        order_discount_amount = 0
        applied_coupon = None

        if coupon_code:
            success, coupon_discount, coupon_instance = engine.apply_coupon(
                coupon_code, final_price_before_coupon
            )
            if not success:
                raise serializers.ValidationError(
                    f"کد تخفیف نامعتبر یا منقضی شده است. "
                    f"حداقل مبلغ سفارش: {coupon_instance.min_order_price:,} تومان"
                    if coupon_instance and coupon_instance.min_order_price
                    else "کد تخفیف نامعتبر یا منقضی شده است"
                )
            order_discount_amount = coupon_discount
            applied_coupon = coupon_instance

        after_items_and_coupon = max(0, subtotal_after_items - order_discount_amount)
        percent_amount = (after_items_and_coupon * percent_fee) // 100 if percent_fee else 0

        final_price = max(
            0,
            after_items_and_coupon + percent_amount + 
            pickup_cost + delivery_cost_final + rush_fee
        )

        return {
            "address": address,
            "computed_items": computed_items,
            "pickup_template": pickup_template,
            "delivery_template": delivery_template,
            "subtotal_raw": subtotal_raw,
            "total_item_discounts": total_item_discounts,
            "subtotal_after_items": subtotal_after_items,
            "order_discount_amount": order_discount_amount,
            "applied_coupon": applied_coupon,
            "pickup_cost": pickup_cost,
            "delivery_cost": delivery_cost_final,
            "rush_fee": rush_fee,
            "percent_fee": percent_fee,
            "final_price": final_price,
            "description": validated_data.get("description", ""),
            "pickup_date": validated_data["pickup_date"],
            "pickup_shift": pickup_shift,
            "delivery_date": validated_data["delivery_date"],
            "delivery_shift": delivery_shift,
        }

    def _normalize_cart_items(self, payload_items):
        """تبدیل payload cart_items به فرمت مورد نیاز create()"""
        normalized = []
        for item in payload_items:
            try:
                product = Product.objects.get(id=item['service_item_id'])
                normalized.append({
                    'product_id': product.id,
                    'product': product,
                    'quantity': item['quantity'],
                    'pricing_tab_id': item.get('pricing_tab_id'),
                    'material': item.get('material', 'نخ'),
                    'size': item.get('size'),
                })
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"محصول با شناسه {item['service_item_id']} یافت نشد."
                )
        return normalized


# ============================================================
# Serializers دیگه (برای cart_views.py)
# ============================================================

class OrderCartItemSerializer(serializers.Serializer):
    id_unique = serializers.CharField()
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    pricing_tab_id = serializers.IntegerField()
    pricing_tab_service = serializers.CharField()
    size_display = serializers.CharField(allow_null=True, required=False)
    material = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1)
    price = serializers.CharField()
    total_price = serializers.IntegerField()

class OrderSessionSerializer(serializers.Serializer):
    items = OrderCartItemSerializer(many=True)
    total_price = serializers.IntegerField()

class AddToCartSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, default=1)
    service = serializers.CharField(required=True)
    material = serializers.CharField(required=True)
    size = serializers.IntegerField(required=False, allow_null=True)