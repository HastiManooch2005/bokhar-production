from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Category, Product, ProductPricingTab, MaterialPrice
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer
)

from discounts.utils import *


# ---------------------------
# PUBLIC: Category List
# ---------------------------
class PublicCategoryListView(generics.ListAPIView):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = []  # Public access


# ---------------------------
# PUBLIC: Product List
# ---------------------------
class PublicProductListView(generics.ListAPIView):
    queryset = Product.objects.filter(status='active').select_related("category")
    serializer_class = ProductListSerializer
    permission_classes = []  # Public access


# ---------------------------
# PUBLIC: Product Detail
# ---------------------------
class PublicProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(status='active').select_related("category")
    serializer_class = ProductDetailSerializer
    permission_classes = []  # Public access



# ---------------------------
# PUBLIC: Final price API
# ---------------------------
@api_view(["GET"])
@permission_classes([AllowAny])
def product_final_price(request, product_id, tab_id, material_id):

    product = get_object_or_404(Product, id=product_id)
    tab = get_object_or_404(ProductPricingTab, id=tab_id)
    material = get_object_or_404(MaterialPrice, id=material_id)

    coupon = request.query_params.get("coupon")

    final_price = calculate_final_price(
        product=product,
        pricing_tab=tab,
        material=material,
        user=request.user if request.user.is_authenticated else None,
        coupon_code=coupon
    )

    return Response({
        "product_id": product_id,
        "final_price": final_price
    })