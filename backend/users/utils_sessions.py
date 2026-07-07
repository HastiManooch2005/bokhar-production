import re
import hashlib
import jwt as pyjwt

from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken


def parse_user_agent(user_agent_string):
    """پارس کردن User-Agent — نسخه بدون نیاز به کتابخانه خارجی"""
    if not user_agent_string:
        return {
            'device': 'Unknown',
            'os': 'Unknown',
            'os_version': '',
            'browser': 'Unknown',
            'browser_version': '',
            'is_mobile': False,
            'is_tablet': False,
            'is_pc': False,
        }

    ua = user_agent_string.lower()

    # --- Device ---
    if 'iphone' in ua:
        device = 'iPhone'
        is_mobile = True
        is_tablet = False
        is_pc = False
    elif 'ipad' in ua:
        device = 'iPad'
        is_mobile = False
        is_tablet = True
        is_pc = False
    elif 'android' in ua:
        if 'mobile' in ua:
            device = 'Android Phone'
            is_mobile = True
            is_tablet = False
            is_pc = False
        else:
            device = 'Android Tablet'
            is_mobile = False
            is_tablet = True
            is_pc = False
    elif 'macintosh' in ua or 'mac os' in ua:
        device = 'Mac'
        is_mobile = False
        is_tablet = False
        is_pc = True
    elif 'windows nt' in ua:
        device = 'Windows PC'
        is_mobile = False
        is_tablet = False
        is_pc = True
    elif 'linux' in ua:
        device = 'Linux'
        is_mobile = False
        is_tablet = False
        is_pc = True
    else:
        device = 'Unknown Device'
        is_mobile = False
        is_tablet = False
        is_pc = False

    # --- OS ---
    os_version = ''
    if 'windows nt 10' in ua:
        os = 'Windows'
        os_version = '10/11'
    elif 'windows nt 6.3' in ua:
        os = 'Windows'
        os_version = '8.1'
    elif 'windows nt 6.1' in ua:
        os = 'Windows'
        os_version = '7'
    elif 'mac os' in ua:
        match = re.search(r'mac os x ([0-9_]+)', ua)
        if match:
            os_version = match.group(1).replace('_', '.')
        os = 'macOS'
    elif 'android' in ua:
        match = re.search(r'android ([0-9.]+)', ua)
        if match:
            os_version = match.group(1)
        os = 'Android'
    elif 'iphone' in ua or 'ipad' in ua:
        match = re.search(r'os ([0-9_]+)', ua)
        if match:
            os_version = match.group(1).replace('_', '.')
        os = 'iOS'
    elif 'linux' in ua:
        os = 'Linux'
    else:
        os = 'Unknown'

    # --- Browser ---
    browser_version = ''
    if 'edg/' in ua:
        match = re.search(r'edg/([0-9.]+)', ua)
        if match:
            browser_version = match.group(1)
        browser = 'Edge'
    elif 'chrome' in ua and 'edg' not in ua:
        match = re.search(r'chrome/([0-9.]+)', ua)
        if match:
            browser_version = match.group(1)
        browser = 'Chrome'
    elif 'firefox' in ua:
        match = re.search(r'firefox/([0-9.]+)', ua)
        if match:
            browser_version = match.group(1)
        browser = 'Firefox'
    elif 'safari' in ua and 'chrome' not in ua:
        match = re.search(r'version/([0-9.]+)', ua)
        if match:
            browser_version = match.group(1)
        browser = 'Safari'
    elif 'opera' in ua or 'opr' in ua:
        match = re.search(r'(?:opera|opr)/([0-9.]+)', ua)
        if match:
            browser_version = match.group(1)
        browser = 'Opera'
    else:
        browser = 'Unknown'

    return {
        'device': device,
        'os': os,
        'os_version': os_version,
        'browser': browser,
        'browser_version': browser_version,
        'is_mobile': is_mobile,
        'is_tablet': is_tablet,
        'is_pc': is_pc,
    }


def get_client_ip(request):
    """دریافت IP واقعی کاربر با پشتیبانی از proxy"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip or '127.0.0.1'


def get_client_hints(request):
    """
    دریافت Client Hints از هدرهای HTTP
    این هدرها اطلاعات دقیق‌تری از دستگاه می‌دن

    Returns:
        dict: {
            'device_name': str,      # مثلاً "iPhone 14 Pro"
            'device_brand': str,     # مثلاً "Apple"
            'device_model': str,     # مثلاً "iPhone14,2"
            'platform': str,         # مثلاً "iOS"
            'platform_version': str, # مثلاً "17.1"
            'architecture': str,   # مثلاً "arm"
            'mobile': bool,        # آیا موبایل است؟
        }
    """
    # Sec-CH-UA-Model: مدل دقیق دستگاه (Chrome 89+, Edge 89+)
    device_model = request.META.get('HTTP_SEC_CH_UA_MODEL', '').strip('"')

    # Sec-CH-UA-Platform: سیستم عامل
    platform = request.META.get('HTTP_SEC_CH_UA_PLATFORM', '').strip('"')

    # Sec-CH-UA-Platform-Version: نسخه سیستم عامل
    platform_version = request.META.get('HTTP_SEC_CH_UA_PLATFORM_VERSION', '').strip('"')

    # Sec-CH-UA-Mobile: ?1 یا ?0
    mobile_hint = request.META.get('HTTP_SEC_CH_UA_MOBILE', '')
    is_mobile = mobile_hint == '?1'

    # Sec-CH-UA-Arch: معماری پردازنده
    architecture = request.META.get('HTTP_SEC_CH_UA_ARCH', '').strip('"')

    # Sec-CH-UA-Full-Version: نسخه کامل مرورگر
    full_version = request.META.get('HTTP_SEC_CH_UA_FULL_VERSION', '').strip('"')

    # Sec-CH-UA: لیست برندها و نسخه‌ها
    ua_brands = request.META.get('HTTP_SEC_CH_UA', '')

    # تشخیص برند از User-Agent یا Client Hints
    device_brand = ''
    if 'Apple' in ua_brands or 'iPhone' in str(request.META.get('HTTP_USER_AGENT', '')):
        device_brand = 'Apple'
    elif 'Samsung' in str(request.META.get('HTTP_USER_AGENT', '')):
        device_brand = 'Samsung'
    elif 'Xiaomi' in str(request.META.get('HTTP_USER_AGENT', '')):
        device_brand = 'Xiaomi'
    elif 'Huawei' in str(request.META.get('HTTP_USER_AGENT', '')):
        device_brand = 'Huawei'
    elif 'Google' in ua_brands:
        device_brand = 'Google'

    # ساخت نام دستگاه
    device_name = ''
    if device_model:
        if device_brand and device_model.startswith(device_brand):
            device_name = device_model
        elif device_brand:
            device_name = f"{device_brand} {device_model}"
        else:
            device_name = device_model

    return {
        'device_name': device_name,
        'device_brand': device_brand,
        'device_model': device_model,
        'platform': platform,
        'platform_version': platform_version,
        'architecture': architecture,
        'mobile': is_mobile,
        'full_version': full_version,
        'ua_brands': ua_brands,
    }


def create_user_session(request, user, refresh_token):
    """
    ایجاد یا آپدیت نشست کاربر بر اساس فینگرپرینت دستگاه.
    اگه همین دستگاه قبلاً نشست فعال داشت → نشست قبلی رو آپدیت کن.
    اگه نه → نشست جدید بساز.
    """
    from .models import UserSession

    user_agent_string = request.META.get('HTTP_USER_AGENT', '')
    ua_info = parse_user_agent(user_agent_string)
    client_hints = get_client_hints(request)
    client_ip = get_client_ip(request)

    # ═══════════════════════════════════════════════════════
    # ساخت فینگرپرینت دستگاه
    # اگه مدل دقیق داریم (Client Hints) → فقط مدل (ثابت‌ترین)
    # اگه نداریم → از ترکیب نوع دستگاه + OS استفاده کن
    # ═══════════════════════════════════════════════════════
    device_model = client_hints.get('device_model', '')
    
    if device_model:
        # مدل دقیق داریم (مثلاً iPhone14,2 یا SM-S901B)
        # فقط مدل → حتی با آپدیت iOS یا مرورگر، همون نشست می‌مونه
        fingerprint_components = [device_model]
    else:
        # مدل نداریم → fallback به ترکیب ثابت‌ترین بخش‌ها
        # device = "iPhone" | "Windows PC" | "Mac" | ...
        # os = "iOS" | "Windows" | "macOS" | ...
        fingerprint_components = [
            ua_info['device'],
            ua_info['os'],
        ]
    
    device_fingerprint = hashlib.sha256(
        '|'.join(filter(None, fingerprint_components)).encode()
    ).hexdigest()

    # استخراج JTI از refresh token
    try:
        token_str = str(refresh_token)
        decoded = pyjwt.decode(token_str, options={"verify_signature": False})
        jti = decoded.get('jti')
    except Exception as e:
        print(f"[SESSION ERROR] Failed to decode refresh token: {e}")
        jti = None

    if not jti:
        print("[SESSION ERROR] No JTI found in refresh token!")
        return None

    # ═══════════════════════════════════════════════════════
    # چک کن ببین همین دستگاه قبلاً نشست فعال داره؟
    # ═══════════════════════════════════════════════════════
    existing_session = UserSession.objects.filter(
        user=user,
        device_fingerprint=device_fingerprint,
        is_active=True,
    ).first()

    if existing_session:
        # ═══════════════════════════════════════════════════
        # همون دستگاهه → نشست قبلی رو آپدیت کن
        # ═══════════════════════════════════════════════════
        print(f"[SESSION UPDATE] Existing session found: id={existing_session.id}")

        # توکن قدیمی رو بلک‌لیست کن (چون الان توکن جدید گرفته)
        try:
            old_outstanding = OutstandingToken.objects.get(
                jti=existing_session.refresh_token_jti
            )
            BlacklistedToken.objects.get_or_create(token=old_outstanding)
        except OutstandingToken.DoesNotExist:
            pass

        # آپدیت فیلدها
        existing_session.refresh_token_jti = jti
        existing_session.ip_address = client_ip
        existing_session.user_agent = user_agent_string
        existing_session.device_name = client_hints['device_name']
        existing_session.device_brand = client_hints['device_brand']
        existing_session.device_model = client_hints['device_model']
        existing_session.device = ua_info['device']
        existing_session.os = ua_info['os']
        existing_session.os_version = ua_info['os_version']
        existing_session.browser = ua_info['browser']
        existing_session.browser_version = ua_info['browser_version']
        existing_session.last_used = timezone.now()
        existing_session.save()

        print(f"[SESSION UPDATED] id={existing_session.id}, user={user.phone}")
        return existing_session

    # ═══════════════════════════════════════════════════════
    # دستگاه جدیده → نشست جدید بساز
    # ═══════════════════════════════════════════════════════
    # غیرفعال کردن نشست‌های قبلی با همین JTI (احتیاطی)
    UserSession.objects.filter(refresh_token_jti=jti).update(is_active=False)

    session = UserSession.objects.create(
        user=user,
        device_fingerprint=device_fingerprint,
        ip_address=client_ip,
        user_agent=user_agent_string,
        device_name=client_hints['device_name'],
        device_brand=client_hints['device_brand'],
        device_model=client_hints['device_model'],
        device=ua_info['device'],
        os=ua_info['os'],
        os_version=ua_info['os_version'],
        browser=ua_info['browser'],
        browser_version=ua_info['browser_version'],
        refresh_token_jti=jti,
        is_active=True,
    )

    print(f"[SESSION CREATED] id={session.id}, user={user.phone}")
    print(f"  device_name={session.device_name}, brand={session.device_brand}, model={session.device_model}")
    print(f"  ua_device={session.device}, os={session.os} {session.os_version}, browser={session.browser} {session.browser_version}")
    print(f"  ip={session.ip_address}, jti={jti[:20]}...")

    return session