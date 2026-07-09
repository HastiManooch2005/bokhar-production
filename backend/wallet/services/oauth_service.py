from datetime import timedelta

import requests

from django.conf import settings
from django.utils import timezone

from ..models.setting_payment_models import PaymentTerminal


class OAuthService:

    BASE_URL = "https://next.zarinpal.com/api/oauth"

    def __init__(self, terminal: PaymentTerminal):
        self.terminal = terminal

    @property
    def client_id(self):
        return self.terminal.client_id

    @property
    def client_secret(self):
        return self.terminal.client_secret
    #برای ارسال otp
    def initialize(
            self,
            username: str,
            channel: str = "sms"
    ):
        url = f"{self.BASE_URL}/initialize"

        payload = {
            "username": username,
            "channel": channel,
        }

        response = requests.post(
            url,
            json=payload,
            timeout=20,
        )

        response.raise_for_status()

        return response.json()
    #برای تمدید Access Token از همین Endpoint با grant_type=refresh_token استفاده می‌شود
    def get_access_token(
            self,
            username: str,
            password: str,
    ):
        url = f"{self.BASE_URL}/token"

        payload = {

            "grant_type": "password",

            "client_id": self.client_id,

            "client_secret": self.client_secret,

            "username": username,

            "password": password,

            "scope": "*",
        }

        response = requests.post(
            url,
            json=payload,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

        self.save_tokens(data)

        return data

    def refresh_access_token(self):

        url = f"{self.BASE_URL}/token"

        payload = {

            "grant_type": "refresh_token",

            "client_id": self.client_id,

            "client_secret": self.client_secret,

            "refresh_token": self.terminal.refresh_token,

            "scope": "*",
        }

        response = requests.post(
            url,
            json=payload,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

        self.save_tokens(data)

        return data

    def save_tokens(self, data):
        self.terminal.token_type = data["token_type"]

        self.terminal.access_token = data["access_token"]

        self.terminal.refresh_token = data["refresh_token"]

        self.terminal.expires_at = (
                timezone.now()
                + timedelta(seconds=data["expires_in"])
        )

        self.terminal.save(
            update_fields=[
                "token_type",
                "access_token",
                "refresh_token",
                "expires_at",
            ]
        )

    def is_token_expired(self):

        if self.terminal.expires_at is None:
            return True

        return timezone.now() >= self.terminal.expires_at

    def get_valid_access_token(self):
        if self.is_token_expired():
            self.refresh_access_token()

        return self.terminal.access_token