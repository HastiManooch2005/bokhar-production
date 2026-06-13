from django.core.management.base import BaseCommand
from faker import Faker
from users.models import *
import random

fake = Faker("fa_IR")


class Command(BaseCommand):
    help = "Generate fake users and addresses"

    def handle(self, *args, **kwargs):

        users = []

        # ساخت 100 کاربر
        for i in range(25):
            phone = f"09{random.randint(100000000, 999999999)}"

            # جلوگیری از شماره تکراری
            while User.objects.filter(phone=phone).exists():
                phone = f"09{random.randint(100000000, 999999999)}"

            user = User.objects.create_user(
                phone=phone,
                fullname=fake.name(),
                password="12345678",
                role="user"
            )

            users.append(user)

        self.stdout.write(
            self.style.SUCCESS(f"{len(users)} users created")
        )

        # ساخت آدرس‌ها
        provinces = [
            "تهران",
            "اصفهان",
            "فارس",
            "خراسان رضوی",
            "آذربایجان شرقی",
            "گیلان",
            "مازندران",
            "البرز",
        ]

        cities = {
            "تهران": ["تهران", "شهریار", "ورامین"],
            "اصفهان": ["اصفهان", "کاشان"],
            "فارس": ["شیراز", "مرودشت"],
            "خراسان رضوی": ["مشهد", "نیشابور"],
            "آذربایجان شرقی": ["تبریز", "مراغه"],
            "گیلان": ["رشت", "انزلی"],
            "مازندران": ["ساری", "بابل"],
            "البرز": ["کرج", "هشتگرد"],
        }

        address_count = 0

        for user in users:
            num_addresses = random.randint(1, 3)

            for i in range(num_addresses):
                province = random.choice(provinces)

                Address.objects.create(
                    user=user,
                    title=random.choice(
                        ["خانه", "محل کار", "خانه پدری"]
                    ),
                    province=province,
                    city=random.choice(cities[province]),
                    district=f"منطقه {random.randint(1, 22)}",
                    address_detail=fake.address(),
                    postal_code=f"{random.randint(1000000000, 9999999999)}",
                    phone=user.phone,
                    is_default=(i == 0),
                    latitude=round(random.uniform(25, 40), 6),
                    longitude=round(random.uniform(44, 63), 6),
                )

                address_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"{address_count} addresses created successfully"
            )
        )