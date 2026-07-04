import os
from datetime import timedelta
from pathlib import Path

from celery.schedules import crontab
from decouple import config
NESHAN_API_KEY = config("NESHAN_API_KEY")

# ---------------- BASE ----------------
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
DJANGO_ENV = config("DJANGO_ENV", default="local")  # "local" | "production"

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0',  'https://bokhar.online','bokhar.online','www.bokhar.online']
if DEBUG:
    ALLOWED_HOSTS += ["localhost", "127.0.0.1"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third Party
    "django_extensions",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_celery_results",
    "django_prometheus",
    "drf_spectacular",
    "django_celery_beat",

    # Local Apps
    "users",
    "products",
    "discounts",
    "wallet",
    "order",
    "report",
    "notifications",

]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "bokhar.middleware.CookieToHeaderMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "bokhar.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "bokhar.wsgi.application"


# ---------------- DATABASE ----------------
if DJANGO_ENV == "production":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": config("POSTGRES_DB"),
            "USER": config("POSTGRES_USER"),
            "PASSWORD": config("POSTGRES_PASSWORD"),
            "HOST": "db",
            "PORT": "5432",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
#-----------------CELERY---------------

CELERY_BEAT_SCHEDULE = {
    'clear-expired-tokens': {
        'task': 'users.tasks.clear_expired_blacklisted_tokens',
        'schedule': crontab(hour=3, minute=0),

    },
    'clear-report-daily': {
        'task': 'notifications.tasks.send_sms_to_seller_daily_report',
        'schedule': crontab(hour=8, minute=0),

    },

}
# ---------------- AUTH ----------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "users.authenticate.CustomBackend",
    "django.contrib.auth.backends.ModelBackend",
]

AUTH_USER_MODEL = "users.User"

# ---------------- INTERNATIONALIZATION ----------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------- CORS & CSRF ----------------
if DJANGO_ENV == "production":
    CORS_ALLOWED_ORIGINS = [
        "https://bokhar.online",
        "https://www.bokhar.online",
    ]
    CSRF_TRUSTED_ORIGINS = [
        "https://bokhar.online",
        "https://www.bokhar.online",
    ]
else:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    CSRF_TRUSTED_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

CORS_ALLOW_CREDENTIALS = True

# ---------------- DRF ----------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "users.authenticate.CookieJWTAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Online Laundry API",
    "DESCRIPTION": "Professional E-Commerce Backend",
    "VERSION": "1.0.0",
    "SECURITY": [{"BearerAuth": []}],
    "COMPONENTS": {
        "securitySchemes": {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
            }
        }
    },
}

# ---------------- JWT ----------------
_IS_PRODUCTION = DJANGO_ENV == "production"

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_COOKIE": "access",
    "AUTH_COOKIE_REFRESH": "refresh",
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SECURE": _IS_PRODUCTION,
    "AUTH_COOKIE_SAMESITE": "Lax",
    "ACCESS_TOKEN_LIFETIME_SECONDS": int(timedelta(minutes=15).total_seconds()),
    "REFRESH_TOKEN_LIFETIME_SECONDS": int(timedelta(days=7).total_seconds()),
# اضافه کردن این خط (اجازه مصرف توکن قبلی تا ۱۰ ثانیه بعد از روتِیت شدن برای رفع مشکل Race Condition)
    "JWT_RENEWAL_GRACE_PERIOD": 10,
}

# ---------------- COOKIE & SESSION SECURITY ----------------
AUTH_COOKIE_SECURE = _IS_PRODUCTION
SESSION_COOKIE_SECURE = _IS_PRODUCTION
CSRF_COOKIE_SECURE = _IS_PRODUCTION

SESSION_COOKIE_HTTPONLY = True
SESSION_SAVE_EVERY_REQUEST = True
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False

# ---------------- LOGGING ----------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG" if DEBUG else "INFO",
    },
}

# ---------------- CACHE ----------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": config("REDIS_CACHE_URL"),
    }
}

# ---------------- CELERY ----------------
CELERY_BROKER_URL = config("CELERY_BROKER_URL")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_BACKEND = "django-db"

# ---------------- MEDIA & STATIC ----------------
STATIC_URL = "/static/"
MEDIA_URL = "/media/"

if DJANGO_ENV == "production":
    STATIC_ROOT = "/app/staticfiles"
    MEDIA_ROOT = "/app/media"
else:
    STATIC_ROOT = BASE_DIR / "staticfiles"
    MEDIA_ROOT = BASE_DIR / "media"

# ---------------- PROXY / SSL (production only) ----------------
if _IS_PRODUCTION:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    USE_X_FORWARDED_HOST = True
    SECURE_SSL_REDIRECT = True

# ---------------- OPENTELEMETRY (production only) ----------------
if _IS_PRODUCTION:
    from opentelemetry import trace
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

    resource = Resource.create({"service.name": "payment-api", "service.version": "1.0.0"})
    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)



#------------------fara payamak----------------------------------------
PAYAMAK_USERNAME = config("PAYAMAK_USERNAME")
PAYAMAK_API_KEY = config("PAYAMAK_API_KEY")
PAYAMAK_SENDER = config("PAYAMAK_SENDER")

