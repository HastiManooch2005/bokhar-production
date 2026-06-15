from faker import Faker
import random

from django.core.management.base import BaseCommand
from django.db import transaction

from products.models import (
    Category,
    Size,
    Product,
    ProductPricingTab,
    MaterialPrice,
)

fake = Faker("fa_IR")


class Command(BaseCommand):
    help = "Generate fake products data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--products",
            type=int,
            default=50,
            help="Number of products to create"
        )

        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete old data before seeding"
        )

    @transaction.atomic
    def handle(self, *args, **options):

        product_count = options["products"]
        clear_data = options["clear"]

        if clear_data:
            self.stdout.write("Deleting old data...")

            MaterialPrice.objects.all().delete()
            ProductPricingTab.objects.all().delete()
            Product.objects.all().delete()
            Size.objects.all().delete()
            Category.objects.all().delete()

            self.stdout.write(
                self.style.SUCCESS("Old data deleted")
            )

        # --------------------
        # Categories
        # --------------------

        categories = []

        category_names = [
            "فرش",
            "موکت",
            "پرده",
            "روتختی",
            "تشک",
            "پتو",
            "مبل",
            "کوسن",
        ]

        for name in category_names:
            category, _ = Category.objects.get_or_create(
                name=name,
                defaults={
                    "is_active": True
                }
            )

            categories.append(category)

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(categories)} categories created"
            )
        )

        # --------------------
        # Sizes
        # --------------------

        sizes = []

        for meter in [3, 6, 9, 12, 15]:
            size, _ = Size.objects.get_or_create(
                meter=meter
            )
            sizes.append(size)

        for sd in [1, 2]:
            size, _ = Size.objects.get_or_create(
                single_double=sd
            )
            sizes.append(size)

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(sizes)} sizes created"
            )
        )

        # --------------------
        # Products
        # --------------------

        products = []

        product_titles = [
            "فرش ماشینی",
            "فرش دستباف",
            "پرده زبرا",
            "پرده حریر",
            "موکت اداری",
            "موکت خانگی",
            "روتختی ترک",
            "تشک طبی",
        ]

        for _ in range(product_count):

            product = Product.objects.create(
                title=f"{random.choice(product_titles)} مدل {random.randint(100,9999)}",

                category=random.choice(categories),

                status=random.choice(
                    [
                        "active",
                        "active",
                        "active",
                        "inactive",
                    ]
                ),

                base_price=random.randint(
                    500000,
                    50000000
                ),
            )

            products.append(product)

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(products)} products created"
            )
        )

        # --------------------
        # Pricing Tabs
        # --------------------

        tabs = []

        tab_names = [
            "سه متری",
            "شش متری",
            "نه متری",
            "دوازده متری",
            "یک نفره",
            "دو نفره",
        ]

        for product in products:

            selected_tabs = random.sample(
                tab_names,
                random.randint(2, 5)
            )

            for tab_name in selected_tabs:

                tab = ProductPricingTab.objects.create(
                    product=product,
                    tab_name=tab_name,

                    size_type=random.choice(
                        [
                            "meter",
                            "single_double",
                        ]
                    )
                )

                tabs.append(tab)

        self.stdout.write(
            self.style.SUCCESS(
                f"{len(tabs)} pricing tabs created"
            )
        )

        # --------------------
        # Material Prices
        # --------------------

        material_prices = {
            "اکریلیک": (1000000, 5000000),
            "پلی استر": (500000, 3000000),
            "ابریشم": (5000000, 20000000),
            "پشم": (2000000, 10000000),
            "نخ": (700000, 4000000),
            "مخمل": (1500000, 8000000),
        }

        material_count = 0

        for tab in tabs:

            selected_materials = random.sample(
                list(material_prices.keys()),
                random.randint(2, 4)
            )

            for material in selected_materials:

                min_price, max_price = material_prices[
                    material
                ]

                MaterialPrice.objects.create(
                    pricing_tab=tab,
                    material=material,
                    price=random.randint(
                        min_price,
                        max_price
                    )
                )

                material_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{material_count} material prices created"
            )
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Seeding completed successfully."
            )
        )