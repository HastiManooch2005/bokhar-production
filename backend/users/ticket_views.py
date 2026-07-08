from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import models
from .ticket_models import Ticket, TicketMessage
from .ticket_serializers import (
    TicketSerializer,
    CreateTicketSerializer,
    AdminReplySerializer,
    TicketMessageSerializer,
)
from .permissions import IsAdminOrSeller


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
    """کاربر/ادمین/فروشنده: جزئیات یه تیکت + پیام‌ها"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.is_staff or getattr(request.user, 'role', '') == "seller":
            ticket = get_object_or_404(Ticket, pk=pk)
        else:
            ticket = get_object_or_404(Ticket, pk=pk, user=request.user)
        serializer = TicketSerializer(ticket, context={"request": request})
        return Response(serializer.data)

    def delete(self, request, pk):
        if request.user.is_staff or getattr(request.user, 'role', '') == "seller":
            ticket = get_object_or_404(Ticket, pk=pk)
        else:
            ticket = get_object_or_404(Ticket, pk=pk, user=request.user)
        ticket.status = "closed"
        ticket.save()
        return Response({"detail": "تیکت بسته شد"}, status=status.HTTP_200_OK)


class CustomerTicketMessageView(APIView):
    """مشتری: ارسال پیام به تیکت خودش + آپلود فایل + لوکیشن"""
    permission_classes = [IsAuthenticated]
    serializer_class = TicketMessageSerializer

    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk, user=request.user)

        # گرفتن فایل از request.FILES
        file_obj = request.FILES.get('file')

        # body از request.data (FormData یا JSON)
        body = request.data.get('body', '')

        # validation دستی: حداقل یکی از body یا file باید باشه
        if not body and not file_obj:
            return Response(
                {"detail": "پیام یا فایل الزامی است"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # latitude/longitude
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        # file_name و file_type
        file_name = (
            request.data.get('file_name')
            or (file_obj.name if file_obj else "")
        )
        file_type = (
            request.data.get('file_type')
            or (self._get_file_type(file_obj) if file_obj else "")
        )

        message = TicketMessage.objects.create(
            ticket=ticket,
            sender=request.user,
            body=body,
            is_admin=False,
            file=file_obj,
            file_name=file_name,
            file_type=file_type,
            latitude=latitude,
            longitude=longitude,
        )

        ticket.status = "open"
        ticket.save()
        ticket.refresh_from_db()

        return Response(
            TicketSerializer(ticket, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )

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


class AdminTicketListView(APIView):
    """ادمین/فروشنده: لیست همه تیکت‌ها با فیلتر و جستجو"""
    permission_classes = [IsAdminOrSeller]

    def get(self, request):
        tickets = Ticket.objects.all().select_related('user').prefetch_related('messages')

        # فیلتر بر اساس وضعیت
        status_filter = request.query_params.get('status')
        if status_filter and status_filter != 'all':
            tickets = tickets.filter(status=status_filter)

        # جستجو
        search = request.query_params.get('search', '').strip()
        if search:
            tickets = tickets.filter(
                models.Q(subject__icontains=search) |
                models.Q(user_full_name__icontains=search) |
                models.Q(user_phone__icontains=search)
            )

        serializer = TicketSerializer(tickets, many=True, context={"request": request})
        return Response(serializer.data)


class AdminTicketReplyView(APIView):
    """ادمین/فروشنده: جواب دادن به تیکت + آپلود فایل"""
    permission_classes = [IsAdminOrSeller]
    serializer_class = AdminReplySerializer

    def post(self, request, pk):
        ticket = get_object_or_404(Ticket, pk=pk)
        serializer = AdminReplySerializer(
            data=request.data,
            context={"request": request, "ticket": ticket},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        ticket.refresh_from_db()
        return Response(
            TicketSerializer(ticket, context={"request": request}).data,
            status=status.HTTP_201_CREATED
        )