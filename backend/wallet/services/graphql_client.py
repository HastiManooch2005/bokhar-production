import requests

from django.conf import settings

from ..models.setting_payment_models import PaymentTerminal
from .oauth_service import OAuthService




class GraphQLClient:

    ENDPOINT = "https://next.zarinpal.com/api/v4/graphql/"

    def __init__(self, terminal: PaymentTerminal):
        self.terminal = terminal
        self.oauth = OAuthService(terminal)

    def get_headers(self):
        access_token = self.oauth.get_valid_access_token()

        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }


    def execute(
            self,
            query,
            variables=None,
    ):
        payload = {
            "query": query,
            "variables": variables,
        }

        response = requests.post(
            self.ENDPOINT,
            json=payload,
            headers=self.get_headers(),
            timeout=30,
        )

        response.raise_for_status()

        data = response.json()

        if "errors" in data:
            raise Exception(data["errors"])

        return data["data"]