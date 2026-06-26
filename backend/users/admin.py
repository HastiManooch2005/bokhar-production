from django.contrib import admin

from .models import *
from .ticket_models import *
# Register your models here.
admin.site.register(User)
admin.site.register(UserSession)
admin.site.register(Ticket)
admin.site.register(TicketMessage)