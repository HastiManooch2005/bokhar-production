from django.urls import path

from ..views.oauth import *

urlpatterns = [

    path(
        "oauth/initialize/",
        OAuthInitializeAPIView.as_view(),
        name="oauth-initialize",
    ),

    path(
        "oauth/token/",
        OAuthTokenAPIView.as_view(),
        name="oauth-token",
    ),

]