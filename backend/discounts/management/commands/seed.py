from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import random

from discounts.models import (
    ProductDiscount,
    GlobalDiscount,
    Coupon
)

from products.models import (
    Product,
    Category,
    ProductPricingTab,
    MaterialPrice
)

from users.models import User


class Command(BaseCommand):
    help = "Generate fake discounts and coupons"

    def handle(self, *args, **kwargs):

        products = list(Product.objects.all())
        categories = list(Category.objects.all())
        pricing_tabs = list(ProductPricingTab.objects.all())
        materials = list(MaterialPrice.objects.all())
        users = list(User.objects.all())

        # -----------------------------
        # GlobalDiscount
        # -----------------------------
        global_count = 20

        for _ in range(global_count):
            GlobalDiscount.objects.create(
                type=random.choice(["percent", "fixed"]),
                value=random.choice([
                    5, 10, 15, 20, 25, 30,
                    50000, 100000, 200000
                ]),
                start_at=timezone.now() - timedelta(
                    days=random.randint(1, 30)
                ),
                end_at=timezone.now() + timedelta(
                    days=random.randint(1, 90)
                ),
                is_active=random.choice([
                    True,
                    True,
                    True,
                    False
                ])
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{global_count} GlobalDiscount created"
            )
        )

        # -----------------------------
        # ProductDiscount
        # -----------------------------
        product_discount_count = 20

        for _ in range(product_discount_count):

            target_type = random.choice([
                "product",
                "category",
                "pricing_tab",
                "material"
            ])

            data = {
                "type": random.choice(
                    ["percent", "fixed"]
                ),
                "value": random.choice([
                    5, 10, 15, 20, 25, 30,
                    50000, 100000
                ]),
                "start_at": timezone.now() - timedelta(
                    days=random.randint(1, 15)
                ),
                "end_at": timezone.now() + timedelta(
                    days=random.randint(1, 60)
                ),
                "is_active": random.choice([
                    True,
                    True,
                    False
                ]),
            }

            if target_type == "product" and products:
                data["product"] = random.choice(products)

            elif target_type == "category" and categories:
                data["category"] = random.choice(categories)

            elif target_type == "pricing_tab" and pricing_tabs:
                data["pricing_tab"] = random.choice(pricing_tabs)

            elif target_type == "material" and materials:
                data["material"] = random.choice(materials)

            ProductDiscount.objects.create(**data)

        self.stdout.write(
            self.style.SUCCESS(
                f"{product_discount_count} ProductDiscount created"
            )
        )

        # -----------------------------
        # Coupon
        # -----------------------------
        coupon_count = 10

        for _ in range(coupon_count):

            Coupon.objects.create(
                type=random.choice([
                    "percent",
                    "fixed"
                ]),

                value=random.choice([
                    5, 10, 15, 20, 25, 30,
                    50000, 100000, 200000
                ]),

                user=(
                    random.choice(users)
                    if users and random.random() < 0.3
                    else None
                ),

                usage_limit=random.randint(1, 100),

                used_count=random.randint(0, 50),

                min_order_amount=random.choice([
                    None,
                    500000,
                    1000000,
                    2000000,
                    5000000
                ]),

                starts_at=timezone.now() - timedelta(
                    days=random.randint(1, 30)
                ),

                ends_at=timezone.now() + timedelta(
                    days=random.randint(1, 90)
                ),

                is_active=random.choice([
                    True,
                    True,
                    True,
                    False
                ])
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"{coupon_count} Coupon created"
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                "All fake discounts generated successfully."
            )
        )