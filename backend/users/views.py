# views.py - فایل کامل

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie, csrf_protect
from django.utils.decorators import method_decorator
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from .tasks import *
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.viewsets import ReadOnlyModelViewSet
from .utils import *
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from .serializers import (
    UserSerializer,
    SendOTPSerializer,
    VerifyOTPSerializer,
    RegisterOTPSerializer,
    LoginOTPSerializer,
    LoginPasswordSerializer,
    EditFullNameSerializer,
    EditPasswordSerializer,
    UserSessionSerializer,
)
from .info_users import *
from .models import UserSession

User = get_user_model()


def _set_jwt_cookies(response, refresh_token):
    simple_jwt = getattr(settings, "SIMPLE_JWT", {})
    cookie_secure = simple_jwt.get("AUTH_COOKIE_SECURE", False)
    cookie_samesite = simple_jwt.get("AUTH_COOKIE_SAMESITE", "Lax")
    access_token = str(refresh_token.access_token)
    refresh_token_str = str(refresh_token)

    response.set_cookie(
        key=simple_jwt.get("AUTH_COOKIE", "access"),
        value=access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=int(simple_jwt.get("ACCESS_TOKEN_LIFETIME_SECONDS", 3600)),
        path="/",
    )
    response.set_cookie(
        key=simple_jwt.get("AUTH_COOKIE_REFRESH", "refresh"),
        value=refresh_token_str,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=int(simple_jwt.get("REFRESH_TOKEN_LIFETIME_SECONDS", 604800)),
        path="/api/refresh/",
    )
    return response


@method_decorator(csrf_exempt, name="dispatch")
class SendOTPView(APIView):
    serializer_class = SendOTPSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            phone = serializer.validated_data["phone"]
            code = generate_otp(phone)
            send_sms.delay(phone, code)
            print(f"OTP for {phone}: {code}", flush=True)
            return Response({"detail": "کد ارسال شد"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class VerifyOTPView(APIView):
    serializer_class = VerifyOTPSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            return Response({"detail": "کد صحیح است"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class RegisterOTPView(APIView):
    serializer_class = RegisterOTPSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            create_user_session(request, user, refresh)  # ✅
            response = Response(
                {
                    "phone": user.phone,
                    "fullname": user.fullname,
                    "is_admin": user.is_admin,
                    "role": user.role,
                    "has_password": user.has_usable_password(),
                    "message": "خوش آمدید",
                },
                status=status.HTTP_200_OK,
            )
            return _set_jwt_cookies(response, refresh)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class LoginOTPView(APIView):
    serializer_class = LoginOTPSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            create_user_session(request, user, refresh)
            response = Response(
                {
                    "phone": user.phone,
                    "fullname": user.fullname,
                    "is_admin": user.is_admin,
                    "role": user.role,
                    "has_password": user.has_usable_password(),
                    "message": "خوش آمدید",
                },
                status=status.HTTP_200_OK,
            )
            return _set_jwt_cookies(response, refresh)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class LoginPasswordView(APIView):
    serializer_class = LoginPasswordSerializer
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            refresh = RefreshToken.for_user(user)
            create_user_session(request, user, refresh)  # ✅
            response = Response(
                {
                    "phone": user.phone,
                    "fullname": user.fullname,
                    "is_admin": user.is_admin,
                    "role": user.role,
                    "has_password": user.has_usable_password(),
                    "message": "خوش آمدید",
                },
                status=status.HTTP_200_OK,
            )
            return _set_jwt_cookies(response, refresh)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class LogOutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        response = Response({"detail": "خروج با موفقیت انجام شد"}, status=200)
        refresh_name = settings.SIMPLE_JWT.get("AUTH_COOKIE_REFRESH", "refresh")
        refresh_token = request.COOKIES.get(refresh_name)
        if refresh_token:
            try:
                import jwt as pyjwt
                token = RefreshToken(refresh_token)
                decoded = pyjwt.decode(refresh_token, options={"verify_signature": False})
                # غیرفعال کردن session
                UserSession.objects.filter(
                    refresh_token_jti=decoded["jti"]
                ).update(is_active=False)
                token.blacklist()
            except (TokenError, InvalidToken):
                pass
        response.delete_cookie(settings.SIMPLE_JWT.get("AUTH_COOKIE", "access"), path="/")
        response.delete_cookie(refresh_name, path="/api/refresh/")
        return response


@method_decorator(csrf_protect, name="dispatch")
class RefreshTokenView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        refresh_name = settings.SIMPLE_JWT.get("AUTH_COOKIE_REFRESH", "refresh")
        old_refresh_token = request.COOKIES.get(refresh_name)

        if not old_refresh_token:
            return Response(
                {"detail": "نشست شما به پایان رسیده است"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(old_refresh_token)
            new_refresh = old_refresh.rotate()

            # آپدیت session با jti جدید
            import jwt as pyjwt
            old_decoded = pyjwt.decode(old_refresh_token, options={"verify_signature": False})
            new_decoded = pyjwt.decode(str(new_refresh), options={"verify_signature": False})
            UserSession.objects.filter(
                refresh_token_jti=old_decoded["jti"]
            ).update(refresh_token_jti=new_decoded["jti"])

            response = Response({"detail": "توکن نوسازی شد"}, status=status.HTTP_200_OK)
            return _set_jwt_cookies(response, new_refresh)

        except (TokenError, InvalidToken):
            response = Response(
                {"detail": "اعتبارنامه نامعتبر است"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            response.delete_cookie(
                settings.SIMPLE_JWT.get("AUTH_COOKIE", "access"), path="/"
            )
            response.delete_cookie(refresh_name, path="/api/refresh/")
            return response


@method_decorator(csrf_protect, name="dispatch")
class VerifyTokenView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


@method_decorator(csrf_protect, name="dispatch")
class EditFullNameView(APIView):
    serializer_class = EditFullNameSerializer
    permission_classes = (IsAuthenticated,)

    def put(self, request):
        serializer = self.serializer_class(
            request.user,
            data=request.data,
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response({"detail": "نام با موفقیت بروزرسانی شد"})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class SendPasswordOTPView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        phone = request.user.phone
        code = generate_otp(phone)
        send_password_otp.delay(phone, code)
        return Response({"detail": "کد تایید ارسال شد."}, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name="dispatch")
class EditPasswordView(APIView):
    serializer_class = EditPasswordSerializer
    permission_classes = (IsAuthenticated,)

    def put(self, request):
        serializer = self.serializer_class(
            request.user,
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "رمز عبور با موفقیت تغییر کرد."}, status=status.HTTP_200_OK)


@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})


@method_decorator(csrf_protect, name="dispatch")
class CustomerViewSet(ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(role="user").order_by("-created_at")


# ─── Session Views ───────────────────────────────────────────

@method_decorator(csrf_protect, name="dispatch")
class UserSessionListView(APIView):
    """لیست دستگاه‌های فعال کاربر"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data)





@method_decorator(csrf_protect, name="dispatch")
class UserSessionDeleteView(APIView):
    """خروج از یه دستگاه خاص"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        session = get_object_or_404(UserSession, pk=pk, user=request.user)

        try:
            outstanding = OutstandingToken.objects.get(jti=session.refresh_token_jti)
            BlacklistedToken.objects.get_or_create(token=outstanding)
        except OutstandingToken.DoesNotExist:
            pass

        session.is_active = False
        session.save()

        return Response({"detail": "دستگاه با موفقیت خارج شد"}, status=status.HTTP_200_OK)