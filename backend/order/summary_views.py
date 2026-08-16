from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers, status  # ✅ serializers اضافه شد

from order.cart_serializer import OrderCreateSerializer


class OrderSummaryAPIView(APIView):
    """
    ویو خلاصه سفارش
    سه حالت آدرس:
    ۱. address_id: آدرس سیو‌شده
    ۲. new_address: آبجکت کامل
    ۳. raw_address: فیلدهای پراکنده از فرانت
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        
        # ============================================================
        # پاک کردن address_id اگه null هست
        # ============================================================
        if 'address_id' in data and data['address_id'] is None:
            data.pop('address_id')
        
        # ============================================================
        # تبدیل فیلدهای پراکنده فرانت به raw_address
        # ============================================================
        has_address_id = 'address_id' in data and data['address_id'] is not None
        has_new_address = bool(data.get('new_address'))
        
        if not has_address_id and not has_new_address:
            raw_fields = ['address_detail', 'latitude', 'longitude']
            has_raw_fields = any(data.get(f) for f in raw_fields)
            
            if has_raw_fields:
                raw_address = {
                    'title': data.get('title', ''),
                    'province': data.get('province', 'تهران'),
                    'city': data.get('city', 'تهران'),
                    'district': data.get('district', ''),
                    'address_detail': data.get('address_detail', ''),
                    'apartment_name': data.get('apartment_name', data.get('plaque', '')),
                    'unit': data.get('unit', 1),
                    'postal_code': data.get('postal_code', ''),
                    'phone': data.get('phone', ''),
                    'latitude': data.get('latitude'),
                    'longitude': data.get('longitude'),
                }
                
                if raw_address['unit']:
                    try:
                        raw_address['unit'] = int(raw_address['unit'])
                    except (ValueError, TypeError):
                        raw_address['unit'] = 1
                
                for coord in ['latitude', 'longitude']:
                    if raw_address[coord]:
                        try:
                            raw_address[coord] = float(raw_address[coord])
                        except (ValueError, TypeError):
                            raw_address[coord] = None
                
                data['raw_address'] = raw_address
                
                for key in ['title', 'province', 'city', 'district', 'address_detail',
                           'apartment_name', 'plaque', 'unit', 'postal_code', 'phone',
                           'latitude', 'longitude']:
                    data.pop(key, None)
        
        # ============================================================
        # سریالایز و اعتبارسنجی
        # ============================================================
        serializer = OrderCreateSerializer(
            data=data,
            context={"request": request}
        )

        try:
            serializer.is_valid(raise_exception=True)
            result = serializer.save()
        except serializers.ValidationError as e:  # ✅ حالا serializers تعریف شده
            return Response(
                e.detail,
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "items_price": result["subtotal_after_items"],
            "pickup_cost": result["pickup_cost"],
            "delivery_cost": result["delivery_cost"],
            "rush_fee": result["rush_fee"],
            "percent_fee": result["percent_fee"],
            "discount": result["order_discount_amount"],
            "final_price": result["final_price"],
        })