# wallet/report_urls.py
from django.urls import path

from ..views.setting_payment_views import *  # ایمپورت ویوها از فایل views موجود در همین پوشه
from ..views.views import *

urlpatterns = [
path("payments/initiate/",              PaymentInitiateView.as_view()),
path("payments/verify/",                PaymentVerifyView.as_view()),
path("payments/wallet/pay/",            WalletPaymentView.as_view()),
path("payments/wallet/charge/",         WalletChargeView.as_view()),
path("payments/wallet/charge/verify/",  WalletChargeVerifyView.as_view()),
path("payments/refund/",                RefundOrderView.as_view()),
path("payments/wallet/withdraw/",       WithdrawalRequestView.as_view()),
path(
    "refund/process/",
    RefundProcessAPIView.as_view(),
)
]
