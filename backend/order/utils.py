from django.utils import timezone
from datetime import timedelta
from django.db import models
from .models import Order, OrderStatus, PickUpTemplate, DeliveryTemplate
import logging
logger = logging.getLogger(__name__)


def get_available_pickup_capacity(shift):
    """ظرفیت خالی تحویل‌گیری برای شیفت مشخص"""
    try:
        template = PickUpTemplate.objects.get(time_shift=shift, is_active=True)
        # ✅ FIX: Return capacity (default 999 if not set)
        return getattr(template, 'capacity', 999)
    except PickUpTemplate.DoesNotExist:
        return 0


def get_available_delivery_capacity(order_type, date, shift):
    """
    ظرفیت خالی تحویل‌دهی با توجه به نوع سفارش (عادی/۲۴/۴۸ ساعته)
    """
    try:
        template = DeliveryTemplate.objects.get(time_shift=shift, is_active=True)
    except DeliveryTemplate.DoesNotExist:
        return 0

    base_orders = Order.objects.filter(
        delivery_date=date,
        delivery_shift=shift
    )

    used_all = base_orders.filter(
        models.Q(status__in=[
            OrderStatus.PAID,
            OrderStatus.PICKED_UP,
            OrderStatus.WASHING,
            OrderStatus.DELIVERED
        ])
    )

    if order_type == "سفارش فوری 24 ساعته":
        capacity = template.urgent_24_capacity
        urgent_24 = used_all.filter(order_type="سفارش فوری 24 ساعته").count()
        return max(0, capacity - urgent_24)

    elif order_type == "48ساعته":
        capacity = template.urgent_48_capacity
        urgent_48 = used_all.filter(order_type="48ساعته").count()
        return max(0, capacity - urgent_48)
    
    # ✅ FIX: Add default for normal orders
    else:
        return 999  # یا capacity عادی