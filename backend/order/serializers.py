from rest_framework import serializers
from users.models import *

class AddressDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id", "title", "province", "city", "district",
            "address_detail", "apartment_name", "unit",
            "postal_code", "latitude", "longitude"
        ]
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        # ✅ کانکت کردن آدرس کامل برای نمایش
        parts = [data["address_detail"]]
        if data.get("apartment_name"):
            parts.append(f"پلاک {data['apartment_name']}")
        if data.get("unit"):
            parts.append(f"واحد {data['unit']}")
        
        data["full_address"] = "، ".join(parts)
        return data


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id", "title", "province", "city", "district",
            "address_detail", "apartment_name", "unit",
            "postal_code", "phone", "latitude", "longitude",
            "is_default", "created_at", "updated_at"
        ]

    def validate(self, data):
        request = self.context.get("request")
        user = request.user

        if self.instance is None:
            # ✅ حداکثر ۱۰ آدرس (با عنوان یا بدون)
            if Address.objects.filter(user=user).count() >= 10:
                raise serializers.ValidationError(
                    "شما فقط می‌توانید حداکثر ۱۰ آدرس ثبت کنید."
                )

        return data

    def create(self, validated_data):
        request = self.context.get("request")
        return Address.objects.create(
            user=request.user,
            **validated_data
        )

class UpdateAddressSerializer(serializers.Serializer):
    city = serializers.CharField(required=False)
    postcode = serializers.IntegerField(required=False)
    title = serializers.CharField(required=False)
    apartment_name = serializers.CharField(required=False)
    address = serializers.CharField(required=False)
    unit = serializers.IntegerField(required=False)

    def update(self, instance, validated_data):

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        return instance