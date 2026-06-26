from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404
from .ticket_models import *
from .ticket_serializers import *
from products.permission import *

class TicketListCreateView(APIView):
    """کاربر: لیست تیکت‌های خودش + ساخت تیکت جدید"""
    permission_classes = [IsAuthenticated]
    serializer_class = TicketSerializer
    def get(self, request):
        tickets = Ticket.objects.filter(user=request.user)
        serializer = self.serializer_class(tickets, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = CreateTicketSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        ticket = serializer.save()
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class TicketDetailView(APIView):
    """کاربر: جزئیات یه تیکت خودش"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk, user=request.user)
        serializer = TicketSerializer(ticket)
        return Response(serializer.data)

    def delete(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk, user=request.user)
        ticket.status = "closed"
        ticket.save()
        return Response({"detail": "تیکت بسته شد"}, status=status.HTTP_200_OK)


class AdminTicketListView(APIView):
    """ادمین: لیست همه تیکت‌ها"""
    permission_classes = [IsAdminUser,IsSeller]

    def get(self, request):
        tickets = Ticket.objects.all()
        serializer = TicketSerializer(tickets, many=True)
        return Response(serializer.data)


class AdminTicketReplyView(APIView):
    """ادمین: جواب دادن به تیکت"""
    permission_classes = [IsAdminUser]
    serializer_class = AdminReplySerializer
    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        serializer = AdminReplySerializer(
            data=request.data,
            context={"request": request, "ticket": ticket},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

