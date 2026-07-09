from rest_framework import serializers


class OAuthInitializeSerializer(serializers.Serializer):

    username = serializers.CharField(max_length=100)

    channel = serializers.ChoiceField(
        choices=[
            "sms",
            "ussd",
        ],
        default="sms",
    )



class OAuthTokenSerializer(serializers.Serializer):
        username = serializers.CharField()

        password = serializers.CharField()
