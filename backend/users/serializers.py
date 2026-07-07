import re
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserSession
from .utils import can_send_otp, is_phone_blocked, validate_otp, verify_otp

def safe_divmod(seconds):
    try:
        seconds = int(seconds)
    except (TypeError, ValueError):
        seconds = 0
    return divmod(seconds, 60)

# فقط یک UserSerializer با has_password
class UserSerializer(serializers.ModelSerializer):
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "fullname", "phone", "has_password", "created_at", "role"]

    def get_has_password(self, obj):
        return obj.has_usable_password()

class SendOTPSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=11)

    def validate(self, attrs):
        phone = attrs["phone"]
        can_send, message = can_send_otp(phone)
        if not can_send:
            raise serializers.ValidationError({"detail": message})
        return attrs

class VerifyOTPSerializer(serializers.Serializer):
    """برای verify جداگانه (pre-check) بدون consume"""
    phone = serializers.CharField()
    code = serializers.CharField()

    def validate(self, attrs):
        phone = attrs["phone"]
        code = attrs["code"]

        blocked, remaining = is_phone_blocked(phone)
        if blocked:
            minutes, seconds = safe_divmod(remaining)
            raise serializers.ValidationError({
                "detail": f"شماره بلاک است. {minutes} دقیقه و {seconds} ثانیه صبر کنید."
            })

        is_valid, message = validate_otp(phone, code, consume=False)
        if not is_valid:
            raise serializers.ValidationError({"detail": message})

        return attrs

class RegisterOTPSerializer(serializers.Serializer):
    phone = serializers.CharField()
    fullname = serializers.CharField()
    otp = serializers.CharField()

    def validate(self, attrs):
        phone = attrs.get("phone")
        otp = attrs.get("otp")

        if not phone or len(phone) != 11:
            raise serializers.ValidationError({"phone": "شماره تلفن باید ۱۱ رقم باشد"})

        blocked, remaining = is_phone_blocked(phone)
        if blocked:
            minutes, seconds = safe_divmod(remaining)
            raise serializers.ValidationError({
                "detail": f"شما بیش از حد تلاش کردید. لطفاً {minutes} دقیقه و {seconds} ثانیه صبر کنید."
            })

        is_valid, message = verify_otp(phone, otp)  # consume=True
        if not is_valid:
            raise serializers.ValidationError({"otp": message})

        return attrs

    def create(self, validated_data):
        phone = validated_data["phone"]
        if User.objects.filter(phone=phone).exists():
            raise serializers.ValidationError({"detail": "قبلاً ثبت‌نام کرده‌اید"})

        user = User.objects.create_user(
            phone=phone,
            fullname=validated_data["fullname"],
        )
        return user

class LoginOTPSerializer(serializers.Serializer):
    phone = serializers.CharField()
    otp = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = attrs.get("phone")
        otp = attrs.get("otp")

        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            raise serializers.ValidationError({"detail": "شماره اشتباه است یا ثبت‌نام نکرده‌اید"})

        blocked, remaining = is_phone_blocked(phone)
        if blocked:
            minutes, seconds = safe_divmod(remaining)
            raise serializers.ValidationError({
                "detail": f"شما بیش از حد تلاش کردید. لطفاً {minutes} دقیقه و {seconds} ثانیه صبر کنید."
            })

        is_valid, message = verify_otp(phone, otp)  # consume=True
        if not is_valid:
            raise serializers.ValidationError({"otp": message})

        attrs["user"] = user
        return attrs

class LoginPasswordSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        phone = attrs.get("phone")
        password = attrs.get("password")
        user = authenticate(phone=phone, password=password)
        if user is None:
            raise serializers.ValidationError({"detail": "رمز عبور یا شماره تلفن اشتباه است"})
        attrs["user"] = user
        return attrs

class EditFullNameSerializer(serializers.Serializer):
    fullname = serializers.CharField()

    def update(self, instance, validated_data):
        instance.fullname = validated_data["fullname"]
        instance.save()
        return instance

class EditPasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )

    otp_code = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True
    )

    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = self.context["request"].user

        old_password = attrs.get("old_password")
        otp_code = attrs.get("otp_code")
        password = attrs.get("password")

        # فقط یکی از این دو باید ارسال شود
        if old_password and otp_code:
            raise serializers.ValidationError({
                "detail": "فقط یکی از رمز فعلی یا کد تایید را وارد کنید."
            })

        # اگر کاربر قبلا رمز داشته
        if user.has_usable_password():

            if not old_password and not otp_code:
                raise serializers.ValidationError({
                    "detail": "رمز فعلی یا کد تایید الزامی است."
                })

            if old_password:
                if not user.check_password(old_password):
                    raise serializers.ValidationError({
                        "old_password": "رمز عبور فعلی اشتباه است."
                    })

            if otp_code:
                is_valid, message = validate_otp(
                    user.phone,
                    otp_code,
                    consume=False
                )

                if not is_valid:
                    raise serializers.ValidationError({
                        "otp_code": message
                    })

        else:
            # اگر قبلاً رمزی نداشته
            if old_password:
                raise serializers.ValidationError({
                    "old_password": "شما هنوز رمز عبور ندارید."
                })

            if otp_code:
                is_valid, message = validate_otp(
                    user.phone,
                    otp_code,
                    consume=False
                )

                if not is_valid:
                    raise serializers.ValidationError({
                        "otp_code": message
                    })

        # اعتبارسنجی رمز

        if len(password) < 8:
            raise serializers.ValidationError({
                "password": "حداقل طول رمز عبور ۸ کاراکتر است."
            })

        if not re.search(r"\d", password):
            raise serializers.ValidationError({
                "password": "رمز عبور باید حداقل یک عدد داشته باشد."
            })

        if not re.search(r"[A-Z]", password):
            raise serializers.ValidationError({
                "password": "رمز عبور باید حداقل یک حرف بزرگ داشته باشد."
            })

        if not re.search(r"[a-z]", password):
            raise serializers.ValidationError({
                "password": "رمز عبور باید حداقل یک حرف کوچک داشته باشد."
            })

        if password != attrs.get("password2"):
            raise serializers.ValidationError({
                "password2": "رمز عبور و تکرار آن یکسان نیست."
            })

        return attrs

    def update(self, instance, validated_data):

        otp_code = validated_data.get("otp_code")

        if otp_code:
            validate_otp(
                instance.phone,
                otp_code,
                consume=True
            )

        instance.set_password(validated_data["password"])
        instance.save()

        return instance


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer with display_name for frontend"""
    name = serializers.CharField(source="display_name", read_only=True)
    display_os = serializers.CharField(read_only=True)
    display_browser = serializers.CharField(read_only=True)

    class Meta:
        model = UserSession
        fields = [
            "id", 
            "ip_address", 
            "name",
            "device", 
            "device_name",
            "device_brand",
            "device_model",
            "device_fingerprint",
            "os", 
            "os_version",
            "browser", 
            "browser_version",
            "display_os",
            "display_browser",
            "is_active", 
            "created_at", 
            "last_used"
        ]