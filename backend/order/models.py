from django.db import models
from django.utils import timezone
from datetime import time, datetime
from products.models import *
from users.models import Address, User
from datetime import timedelta
from discounts.models import (
    ProductDiscount,
    Coupon,
)


def get_deleted_users():
    user, _ = User.objects.get_or_create(phone="12345678901", fullname="کاربر حدف شده.")
    return user

class TimeRange(models.TextChoices):
    MORNING  = "morning",  "صبح (۸–۱۳)"
    EVENING  = "evening",  "عصر (۱۶–۲۰)"

TIME_START = {
    TimeRange.MORNING : time( 8,  0),
    TimeRange.EVENING : time(16,  0),
}

TIME_END = {
    TimeRange.MORNING : time(13,  0),
    TimeRange.EVENING : time(20,  0),
}

FRONTEND_TIME_MAP = {
    "۸ صبح تا ۱۳" : TimeRange.MORNING,
    "۱۶ تا ۲۰"    : TimeRange.EVENING,
}

class RushFeeSetting(models.Model):
    fee_24h = models.PositiveIntegerField(default=50000, verbose_name="هزینه ۲۴ ساعته")
    fee_48h = models.PositiveIntegerField(default=25000, verbose_name="هزینه ۴۸ ساعته")
    
    is_24h_enabled = models.BooleanField(default=True, verbose_name="فعال بودن ۲۴ ساعته")
    is_48h_enabled = models.BooleanField(default=True, verbose_name="فعال بودن ۴۸ ساعته")
    
    percent_24h = models.PositiveIntegerField(default=0, verbose_name="درصد ۲۴ ساعته")
    percent_48h = models.PositiveIntegerField(default=0, verbose_name="درصد ۴۸ ساعته")
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "تنظیمات هزینه فوری"
        verbose_name_plural = "تنظیمات هزینه فوری"

    def __str__(self):
        return f"۲۴ساعته: {self.fee_24h} | ۴۸ساعته: {self.fee_48h}"


class PickUpTemplate(models.Model):
    time_shift   = models.CharField(
        max_length=20,
        choices=TimeRange.choices,
        default=TimeRange.MORNING,
        unique=True,
    )
    base_price   = models.PositiveIntegerField(default=0)
    price_add    = models.PositiveIntegerField(default=0)
    is_active    = models.BooleanField(default=True)

    class Meta:
        verbose_name = "شیفت تحویل‌گیری"

    def is_available(self):
        return self.is_active

    def __str__(self):
        return f"تحویل‌گیری | {self.get_time_shift_display()}"


class DeliveryTemplate(models.Model):
    time_shift = models.CharField(
        max_length=20,
        choices=TimeRange.choices,
        default=TimeRange.MORNING,
        unique= True
    )
    urgent_24_capacity  = models.PositiveIntegerField(default=5)
    urgent_48_capacity  = models.PositiveIntegerField(default=10)
    
    disabled_dates = models.JSONField(
        default=list,
        blank=True,
        help_text="لیست تاریخ‌های غیرفعال (YYYY-MM-DD)"
    )
    
    base_price = models.PositiveIntegerField(default=0)
    price_add = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "شیفت تحویل‌دهی"

    def __str__(self):
        return f"تحویل‌دهی | {self.get_time_shift_display()}"


class OrderStatus(models.TextChoices):
    PAID = "paid", "پرداخت شده"
    PICKED_UP = "picked_up", "دریافت از مشتری"
    WASHING = "washing", "در حال شستشو"
    DELIVERED = "delivered", "تحویل داده شده"
    CANCELED = "canceled", "لغو شده  "
    RETURNED = "returned" , "برگشتی "

class Order(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.SET(get_deleted_users), related_name="orders"
    )
    address = models.ForeignKey(
        Address, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="orders"
    )

    applied_coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="orders"
    )

    pickup_date = models.DateField()
    pickup_shift = models.CharField(
        max_length=20,
        choices=TimeRange.choices,
        default=TimeRange.MORNING,
    )
    delivery_date = models.DateField()
    delivery_shift = models.CharField(
        max_length=20,
        choices=TimeRange.choices,
        default=TimeRange.MORNING,
    )
    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        db_index=True,
    )

    pickup_cost = models.PositiveIntegerField(default=0)
    delivery_cost = models.PositiveIntegerField(default=0)
    percent_fee = models.PositiveIntegerField(default=0)
    rush_fee = models.PositiveIntegerField(default=0)

    subtotal_raw = models.PositiveIntegerField(default=0)
    total_item_discounts = models.PositiveIntegerField(default=0)
    subtotal_after_items = models.PositiveIntegerField(default=0)
    order_discount_amount = models.PositiveIntegerField(default=0)
    final_price = models.PositiveIntegerField(default=0)

    paid_at = models.DateTimeField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    create_time = models.DateTimeField(auto_now_add=True)
    order_type = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "user"]),
            models.Index(fields=["pickup_date", "pickup_shift"]),
            models.Index(fields=["delivery_date", "delivery_shift"]),
        ]

    @property
    def delivery_deadline(self):
        end_time = TIME_END.get(self.pickup_shift)
        if not end_time:
            return None

        deadline_naive = datetime.combine(
            self.pickup_date,
            end_time
        )
        return timezone.make_aware(deadline_naive)

    @property
    def remaining_time(self):
        deadline = self.delivery_deadline
        if not deadline:
            return None
        return deadline - timezone.now()

    @property
    def late_by(self):
        if self.status not in {OrderStatus.PAID, OrderStatus.WASHING, OrderStatus.PICKED_UP}:
            return timedelta(0)

        deadline = self.delivery_deadline
        if not deadline:
            return timedelta(0)

        now = timezone.now()
        if now <= deadline:
            return timedelta(0)

        return now - deadline

    @property
    def late_minutes(self):
        td = self.late_by
        return td.total_seconds() // 60

    @property
    def late_display(self):
        minutes = int(self.late_minutes)
        if minutes <= 0:
            return "دیر نشده"
        hours = minutes // 60
        rem_minutes = minutes % 60
        if hours > 0:
            return f"{int(hours)} ساعت و {int(rem_minutes)} دقیقه دیر شده"
        return f"{int(rem_minutes)} دقیقه دیر شده"

    @property
    def pickup_datetime_for_range(self):
        if not self.pickup_date or not self.pickup_shift:
            return None
        start_time = TIME_START.get(self.pickup_shift)
        if not start_time:
            return None
        naive = datetime.combine(self.pickup_date, start_time)
        return timezone.make_aware(naive)

    @property
    def delivery_datetime_for_range(self):
        if not self.delivery_date or not self.delivery_shift:
            return None
        start_time = TIME_START.get(self.delivery_shift)
        if not start_time:
            return None
        naive = datetime.combine(self.delivery_date, start_time)
        return timezone.make_aware(naive)

    @property
    def total_hours_between_pickup_and_delivery(self):
        pdt = self.pickup_datetime_for_range
        ddt = self.delivery_datetime_for_range
        if not pdt or not ddt:
            return None
        return (ddt - pdt).total_seconds() / 3600

    def order_range_type(self):
        hours = self.total_hours_between_pickup_and_delivery
        if hours is None:
            raise ValueError("تاریخ یا شیفت نامعتبر است")
        
        # ✅ حذف check همون‌روز — الان مجازه
        # فقط چک می‌کنیم تحویل قبل از تحویل‌دادن نباشه
        if hours <= 0:
            raise ValueError("زمان تحویل گرفتن باید بعد از تحویل دادن باشد")
        
        if hours <= 24:
            return "سفارش فوری 24 ساعته"
        if hours <= 48:
            return "48ساعته"
        return "سفارش عادی"

    def calculate_rush_fee(self):
        settings = RushFeeSetting.objects.first()
        if not settings:
            return 0
        
        try:
            order_type = self.order_range_type()
        except ValueError:
            return 0
        
        if order_type == "سفارش فوری 24 ساعته":
            if settings.is_24h_enabled:
                return settings.fee_24h
            return 0
            
        if order_type == "48ساعته":
            if settings.is_48h_enabled:
                return settings.fee_48h
            return 0
            
        return 0

    def calculate_percent_fee(self):
        settings = RushFeeSetting.objects.first()
        if not settings:
            return 0
            
        try:
            order_type = self.order_range_type()
        except ValueError:
            return 0
        
        if order_type == "سفارش فوری 24 ساعته":
            if settings.is_24h_enabled:
                return settings.percent_24h
            return 0
            
        if order_type == "48ساعته":
            if settings.is_48h_enabled:
                return settings.percent_48h
            return 0
            
        return 0

    def save(self, *args, **kwargs):
        if not self.pk:
            if not self.rush_fee:
                self.rush_fee = self.calculate_rush_fee()
            if not self.percent_fee:
                self.percent_fee = self.calculate_percent_fee()
            if not self.order_type:
                self.order_type = self.order_range_type()
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="order_items"
    )
    product = models.ForeignKey(
        Product, on_delete=models.PROTECT, related_name="order_items"
    )
    size = models.ForeignKey(
        Size, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items"
    )
    pricing_tab = models.ForeignKey(
        ProductPricingTab, on_delete=models.PROTECT, related_name="order_items"
    )
    material = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField(default=1)

    original_price = models.PositiveIntegerField()
    item_discount = models.PositiveIntegerField(default=0)
    price = models.PositiveIntegerField()
    applied_product_discount = models.ForeignKey(
        ProductDiscount,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="order_items"
    )

    def __str__(self):
        return f"{self.product.title} ({self.quantity})"

class OrderStatusLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    from_status = models.CharField(null=True, blank=True, max_length=20)
    to_status = models.CharField(max_length=20)

    class Meta:
        ordering = ['-timestamp']