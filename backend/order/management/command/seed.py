from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from order.models import (
    Order,
    OrderItem,
    OrderStatusLog,
    OrderStatus,
    TimeRange
)

from users.models import User, Address
from products.models import (
    Product,
    ProductPricingTab,
    MaterialPrice,
    Size
)
from discounts.models import Coupon, ProductDiscount


class Command(BaseCommand):
    help = "Generate fake orders"

    def handle(self, *args, **kwargs):

        users = list(User.objects.all())
        addresses = list(Address.objects.all())
        products = list(Product.objects.all())
        sizes = list(Size.objects.all())
        coupons = list(Coupon.objects.all())

        if not users or not products:
            self.stdout.write(
                self.style.ERROR(
                    "Users or Products not found"
                )
            )
            return

        order_count = 1000

        for _ in range(order_count):

            user = random.choice(users)

            user_addresses = [
                a for a in addresses
                if a.user_id == user.id
            ]

            if not user_addresses:
                continue

            pickup_date = timezone.now().date() + timedelta(
                days=random.randint(1, 7)
            )

            delivery_date = pickup_date + timedelta(
                days=random.randint(1, 4)
            )

            order = Order.objects.create(
                user=user,

                address=random.choice(
                    user_addresses
                ),

                applied_coupon=(
                    random.choice(coupons)
                    if coupons and random.random() < 0.3
                    else None
                ),

                pickup_date=pickup_date,

                pickup_shift=random.choice([
                    TimeRange.MORNING,
                    TimeRange.EVENING
                ]),

                delivery_date=delivery_date,

                delivery_shift=random.choice([
                    TimeRange.MORNING,
                    TimeRange.EVENING
                ]),

                status=random.choice([
                    OrderStatus.PAID,
                    OrderStatus.WASHING,
                    OrderStatus.PICKED_UP,
                    OrderStatus.DELIVERED,
                ]),

                pickup_cost=random.randint(
                    10000,
                    50000
                ),

                delivery_cost=random.randint(
                    10000,
                    50000
                ),

                subtotal_raw=0,
                total_item_discounts=0,
                subtotal_after_items=0,
                order_discount_amount=0,
                final_price=0,
            )

            subtotal_raw = 0
            total_discount = 0

            item_count = random.randint(1, 5)

            for _ in range(item_count):

                product = random.choice(products)

                tabs = list(
                    product.pricing_tabs.all()
                )

                if not tabs:
                    continue

                tab = random.choice(tabs)

                materials = list(
                    tab.material_prices.all()
                )

                if not materials:
                    continue

                material = random.choice(materials)

                quantity = random.randint(1, 5)

                original_price = material.price

                item_discount = random.randint(
                    0,
                    int(original_price * 0.2)
                )

                final_price = (
                    original_price -
                    item_discount
                )

                OrderItem.objects.create(
                    order=order,
                    product=product,
                    size=random.choice(sizes)
                    if sizes else None,
                    pricing_tab=tab,
                    material=material.material,
                    quantity=quantity,
                    original_price=original_price,
                    item_discount=item_discount,
                    price=final_price,
                    applied_product_discount=None
                )

                subtotal_raw += (
                    original_price * quantity
                )

                total_discount += (
                    item_discount * quantity
                )

            subtotal_after_items = (
                subtotal_raw -
                total_discount
            )

            order_discount_amount = random.randint(
                0,
                int(subtotal_after_items * 0.1)
            )

            final_order_price = (
                subtotal_after_items
                - order_discount_amount
                + order.pickup_cost
                + order.delivery_cost
                + order.rush_fee
            )

            order.subtotal_raw = subtotal_raw
            order.total_item_discounts = total_discount
            order.subtotal_after_items = subtotal_after_items
            order.order_discount_amount = order_discount_amount
            order.final_price = max(
                final_order_price,
                0
            )

            order.save()

            OrderStatusLog.objects.create(
                user=user,
                order=order,
                from_status=None,
                to_status=order.status
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{order_count} fake orders created."
            )
        )