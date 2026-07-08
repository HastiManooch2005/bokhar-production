from django.db import models
from django.conf import settings


class Ticket(models.Model):
    STATUS_CHOICES = [
        ("open", "باز"),
        ("answered", "پاسخ داده شده"),
        ("closed", "بسته"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tickets"
    )

    # Snapshot اطلاعات کاربر در زمان ایجاد تیکت
    user_full_name = models.CharField(max_length=255, blank=True, verbose_name="نام کاربر")
    user_phone = models.CharField(max_length=20, blank=True, verbose_name="شماره تماس کاربر")

    subject = models.CharField(max_length=255, verbose_name="موضوع")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="open",
        verbose_name="وضعیت"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "تیکت"
        verbose_name_plural = "تیکت‌ها"

    def save(self, *args, **kwargs):
        if not self.pk:
            user = self.user
            self.user_full_name = (
                getattr(user, 'get_full_name', lambda: None)()
                or getattr(user, 'fullname', None)
                or getattr(user, 'first_name', None)
                or getattr(user, 'phone', None)
                or getattr(user, 'email', None)
                or str(user)
            )
            self.user_phone = (
                getattr(user, 'phone', None)
                or getattr(user, 'mobile', None)
                or getattr(user, 'email', None)
                or ''
            )
        super().save(*args, **kwargs)

    @property
    def body(self):
        """متن اولین پیام تیکت (برای نمایش در لیست)"""
        first_msg = self.messages.first()
        return first_msg.body if first_msg else ""

    def __str__(self):
        return f"{self.user_full_name or self.user} - {self.subject}"


class TicketMessage(models.Model):
    FILE_TYPE_CHOICES = [
        ("image", "تصویر"),
        ("video", "ویدیو"),
        ("audio", "صوت"),
        ("file", "فایل"),
        ("location", "موقعیت مکانی"),
    ]

    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ticket_messages"
    )

    # Snapshot اطلاعات فرستنده
    sender_full_name = models.CharField(max_length=255, blank=True, verbose_name="نام فرستنده")
    sender_phone = models.CharField(max_length=20, blank=True, verbose_name="شماره تماس فرستنده")

    body = models.TextField(blank=True, verbose_name="متن پیام")
    is_admin = models.BooleanField(default=False, verbose_name="از طرف ادمین")

    # فایل پیوست
    file = models.FileField(
        upload_to="ticket_files/%Y/%m/",
        blank=True,
        null=True,
        verbose_name="فایل پیوست"
    )
    file_name = models.CharField(max_length=255, blank=True, null=True, verbose_name="نام فایل")
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        blank=True,
        verbose_name="نوع فایل"
    )

    # موقعیت مکانی
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True
    )
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "پیام تیکت"
        verbose_name_plural = "پیام‌های تیکت"

    def save(self, *args, **kwargs):
        if not self.pk:
            sender = self.sender
            self.sender_full_name = (
                getattr(sender, 'get_full_name', lambda: None)()
                or getattr(sender, 'fullname', None)
                or getattr(sender, 'first_name', None)
                or getattr(sender, 'phone', None)
                or getattr(sender, 'email', None)
                or str(sender)
            )
            self.sender_phone = (
                getattr(sender, 'phone', None)
                or getattr(sender, 'mobile', None)
                or getattr(sender, 'email', None)
                or ''
            )
            # Auto detect file type
            if self.file and not self.file_type:
                mime = self.file.content_type if hasattr(self.file, 'content_type') else ''
                if mime.startswith('image/'):
                    self.file_type = 'image'
                elif mime.startswith('video/'):
                    self.file_type = 'video'
                elif mime.startswith('audio/'):
                    self.file_type = 'audio'
                else:
                    self.file_type = 'file'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{'ادمین' if self.is_admin else 'کاربر'} - {self.ticket.subject}"