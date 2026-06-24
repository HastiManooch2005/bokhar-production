

import requests
from django.conf import settings


def send_sms(to: str, message: str):
    url = "https://rest.payamak-panel.com/api/SendSMS/SendSMS"


    payload = {
            "username": settings.PAYAMAK_USERNAME,
            "password": settings.PAYAMAK_API_KEY,
            "to": to,
            "from": settings.PAYAMAK_SENDER,
            "text": f"{message}\n\nلغو11",
            "isFlash": False,
    }

    response = requests.post(url, json=payload, timeout=15)
    response.raise_for_status()

    data = response.json()

    if data.get("RetStatus") != 1:
        raise Exception(
            f"Payamak Error: {data.get('StrRetStatus')} | {data}"
        )

    return data