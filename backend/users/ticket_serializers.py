from rest_framework import serializers
from .ticket_models import Ticket, TicketMessage


class TicketMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender_full_name", read_only=True)
    sender_phone = serializers.CharField(read_only=True)  # ← source حذف شد

    class Meta:
        model = TicketMessage
        fields = ["id", "sender_name", "sender_phone", "body", "is_admin", "created_at"]
        read_only_fields = ["is_admin", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    messages = TicketMessageSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.fullname", read_only=True)
    user_phone_live = serializers.CharField(source="user.phone", read_only=True)
    body = serializers.CharField(read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "user_name", "user_phone_live", 
            "user_full_name", "user_phone",  # snapshot ها
            "subject", "status", "body", "messages", "created_at", "updated_at"
        ]
        read_only_fields = ["status", "created_at", "updated_at", "user_full_name", "user_phone"]


class CreateTicketSerializer(serializers.ModelSerializer):
    body = serializers.CharField(write_only=True)

    class Meta:
        model = Ticket
        fields = ["subject", "body"]

    def create(self, validated_data):
        body = validated_data.pop("body")
        user = self.context["request"].user
        
        ticket = Ticket.objects.create(
            user=user,
            **validated_data
        )
        
        TicketMessage.objects.create(
            ticket=ticket,
            sender=user,
            body=body,
            is_admin=False,
        )
        return ticket


class AdminReplySerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender_full_name", read_only=True)
    sender_phone = serializers.CharField(read_only=True)  # ← source حذف شد

    class Meta:
        model = TicketMessage
        fields = ["id", "sender_name", "sender_phone", "body", "is_admin", "created_at"]
        read_only_fields = ["is_admin", "created_at"]

    def create(self, validated_data):
        ticket = self.context["ticket"]
        admin = self.context["request"].user
        
        message = TicketMessage.objects.create(
            ticket=ticket,
            sender=admin,
            body=validated_data["body"],
            is_admin=True,
        )
        ticket.status = "answered"
        ticket.save()
        return message