# utils.py - اضافه کن به فایل موجود

import jwt


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def parse_user_agent(user_agent: str) -> dict:
    ua = user_agent.lower()

    if "android" in ua:
        os = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os = "iOS"
    elif "windows" in ua:
        os = "Windows"
    elif "mac" in ua:
        os = "macOS"
    elif "linux" in ua:
        os = "Linux"
    else:
        os = "Unknown"

    if "chrome" in ua and "edg" not in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "edg" in ua:
        browser = "Edge"
    else:
        browser = "Unknown"

    if "mobile" in ua or "android" in ua or "iphone" in ua:
        device = "Mobile"
    elif "tablet" in ua or "ipad" in ua:
        device = "Tablet"
    else:
        device = "Desktop"

    return {"os": os, "browser": browser, "device": device}


def create_user_session(request, user, refresh_token):
    from .models import UserSession
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    parsed = parse_user_agent(user_agent)
    decoded = jwt.decode(str(refresh_token), options={"verify_signature": False})

    UserSession.objects.update_or_create(
        refresh_token_jti=decoded["jti"],
        defaults={
            "user": user,
            "ip_address": get_client_ip(request),
            "user_agent": user_agent,
            "device": parsed["device"],
            "os": parsed["os"],
            "browser": parsed["browser"],
            "is_active": True,
        }
    )