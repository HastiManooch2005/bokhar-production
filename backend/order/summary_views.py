from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from order.cart_serializer import OrderCreateSerializer


class OrderSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OrderCreateSerializer(
            data=request.data,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)

        result = serializer.save()

        return Response({
            "items_price": result["subtotal_after_items"],
            "pickup_cost": result["pickup_cost"],
            "delivery_cost": result["delivery_cost"],
            "rush_fee": result["rush_fee"],
            "percent_fee": result["percent_fee"],
            "discount": result["order_discount_amount"],
            "final_price": result["final_price"],
        })