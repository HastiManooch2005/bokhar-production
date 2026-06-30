from django.urls import path
from rest_framework.routers import DefaultRouter
from .ticker_views import *
from .views import *

app_name = "users"

urlpatterns = [
    path("send/otp/", SendOTPView.as_view(), name="otp"),
    path("send/otp/password",SendPasswordOTPView.as_view(), name="password"),
    path("verify/otp/", VerifyOTPView.as_view(), name="verify-otp"),  
    path("register/otp/", RegisterOTPView.as_view(), name="register"),
    path("login/otp/", LoginOTPView.as_view(), name="login_otp"),
    path("login/", LoginPasswordView.as_view(), name="login"),
    path("edit/name/", EditFullNameView.as_view(), name="fullname"),
    path("edit/password/", EditPasswordView.as_view(), name="password"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("verify/", VerifyTokenView.as_view(), name="verify"),
    path("logout/", LogOutView.as_view(), name="logout"),
    path("csrf/", get_csrf_token, name="get-csrf-token"),
# کاربر
    path("tickets/", TicketListCreateView.as_view(), name="ticket-list-create"),
    path("tickets/<int:pk>/", TicketDetailView.as_view(), name="ticket-detail"),

    # ادمین
    path("admin/tickets/", AdminTicketListView.as_view(), name="admin-ticket-list"),
    path("admin/tickets/<int:pk>/reply/", AdminTicketReplyView.as_view(), name="admin-ticket-reply"),

path("sessions/", UserSessionListView.as_view(), name="session-list"),
path("sessions/<int:pk>/", UserSessionDeleteView.as_view(), name="session-delete"),

 
 
]

# ------------------------------------------------------------------
# Router
# ------------------------------------------------------------------

router = DefaultRouter()
router.register("customers", CustomerViewSet, basename="customers")

urlpatterns += router.urls
