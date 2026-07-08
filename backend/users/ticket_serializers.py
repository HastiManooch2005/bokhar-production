from rest_framework import serializers
from .ticket_models import Ticket, TicketMessage


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender_full_name", read_only=True)
    sender_phone = serializers.CharField(read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketMessage
        fields = [
            "id", "sender_name", "sender_phone", "body",
            "is_admin", "created_at", "file_url", "file_name", "file_type",
            "latitude", "longitude"
        ]
        read_only_fields = ["is_admin", "created_at", "sender_name", "sender_phone", "file_url"]
        extra_kwargs = {
            'body': {'required': False, 'allow_blank': True},
        }

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class TicketSerializer(serializers.ModelSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.fullname", read_only=True)
    user_phone_live = serializers.CharField(source="user.phone", read_only=True)
    body = serializers.CharField(read_only=True)
    message_count = serializers.IntegerField(source="messages.count", read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "user_name", "user_phone_live",
            "user_full_name", "user_phone",
            "subject", "status", "body", "messages",
            "message_count", "created_at", "updated_at"
        ]
        read_only_fields = [
            "status", "created_at", "updated_at",
            "user_full_name", "user_phone"
        ]


class CreateTicketSerializer(serializers.ModelSerializer):
    body = serializers.CharField(write_only=True)

    class Meta:
        model = Ticket
        fields = ["subject", "body"]

    def create(self, validated_data):
        body = validated_data.pop("body")
        user = self.context["request"].user

        ticket = Ticket.objects.create(user=user, **validated_data)

        TicketMessage.objects.create(
            ticket=ticket,
            sender=user,
            body=body,
            is_admin=False,
        )
        return ticket


class AdminReplySerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender_full_name", read_only=True)
    sender_phone = serializers.CharField(read_only=True)
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = TicketMessage
        fields = [
            "id", "sender_name", "sender_phone", "body",
            "is_admin", "created_at", "file", "file_name", "file_type"
        ]
        read_only_fields = ["is_admin", "created_at", "file_name", "file_type"]
        extra_kwargs = {
            'body': {'required': False, 'allow_blank': True},
        }

    def create(self, validated_data):
        ticket = self.context["ticket"]
        admin = self.context["request"].user
        file_obj = validated_data.pop('file', None)

        request = self.context.get('request')
        file_name = ""
        file_type = ""
        if request and request.data.get('file_name'):
            file_name = request.data.get('file_name')
        if file_obj:
            file_name = file_name or file_obj.name
            file_type = (
                request.data.get('file_type') if request else ""
            ) or self._get_file_type(file_obj)

        message = TicketMessage.objects.create(
            ticket=ticket,
            sender=admin,
            body=validated_data.get("body", ""),
            is_admin=True,
            file=file_obj,
            file_name=file_name,
            file_type=file_type,
        )

        ticket.status = "answered"
        ticket.save()
        return message

    def _get_file_type(self, file_obj):
        if not file_obj:
            return ""
        mime = getattr(file_obj, 'content_type', '') or ''
        if mime.startswith('image/'):
            return 'image'
        elif mime.startswith('video/'):
            return 'video'
        elif mime.startswith('audio/'):
            return 'audio'
        return 'file'