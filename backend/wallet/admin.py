from django.contrib import admin

from .models.models import *
from .models.setting_payment_models import *

# Register your models here.
admin.site.register(Wallet)
admin.site.register(WalletTransaction)
admin.site.register(WithdrawalRequest)
admin.site.register(PaymentSession)
admin.site.register(RefundRequest)

