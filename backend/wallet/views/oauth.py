from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..models.setting_payment_models import PaymentTerminal
from ..serializers.oauth_serializers import (
    OAuthInitializeSerializer,
    OAuthTokenSerializer,
)

from ..services.oauth_service import OAuthService



class OAuthInitializeAPIView(APIView):

    permission_classes = []



    def post(self, request):

        serializer = OAuthInitializeSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        terminal = PaymentTerminal.objects.get(
            is_active=True
        )

        service = OAuthService(terminal)

        result = service.initialize(
            username=serializer.validated_data["username"],
            channel=serializer.validated_data["channel"],
        )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )



class OAuthTokenAPIView(APIView):

    permission_classes = []


    def post(self, request):

        serializer = OAuthTokenSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        terminal = PaymentTerminal.objects.get(
            is_active=True
        )

        service = OAuthService(terminal)

        result = service.get_access_token(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

