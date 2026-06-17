import logging

from django_redis import get_redis_connection
from redis.exceptions import LockError, LockNotOwnedError
from rest_framework.exceptions import ValidationError

logger = logging.getLogger(__name__)


class DistributedLock:
    """
    قفل توزیع‌شده با Redis برای جلوگیری از پردازش همزمان.

    مثال:
        with DistributedLock(key=f"verify:{authority}", timeout=60, blocking_timeout=1):
            # کد حساس اینجا — فقط یک worker همزمان اجرا می‌کند
            ...

    پارامترها:
        key:              کلید یکتا در Redis (مثلاً "verify:A000...001")
        timeout:          TTL قفل در Redis (ثانیه) — اگه سرور کرش کنه قفل خودکار آزاد میشه
        blocking_timeout: حداکثر مدت انتظار برای گرفتن قفل (ثانیه)
                          اگه بعد از این مدت نگرفت → ValidationError
    """

    def __init__(self, key: str, timeout: int = 60, blocking_timeout: int = 1):
        self._redis    = get_redis_connection("default")
        self._lock     = self._redis.lock(
            name=key,
            timeout=timeout,
            blocking_timeout=blocking_timeout,
        )
        self._acquired = False

    # ------------------------------------------------------------------
    def acquire(self) -> bool:
        """
        سعی می‌کند قفل را بگیرد.
        اگه blocking_timeout بگذرد redis-py مستقیم LockError میده.
        """
        try:
            # blocking=True یعنی تا blocking_timeout ثانیه صبر کن
            self._acquired = self._lock.acquire(blocking=True)
            return self._acquired
        except LockError:
            # blocking_timeout رد شد و نتونست قفل بگیره
            self._acquired = False
            return False

    def release(self) -> None:
        """
        قفل را آزاد می‌کند — فقط اگه همین instance گرفته باشد.
        LockNotOwnedError: قفل منقضی شده یا worker دیگه‌ای آزادش کرده.
        """
        if not self._acquired:
            return
        try:
            self._lock.release()
        except LockNotOwnedError:
            # timeout رد شده و Redis قفل رو خودکار حذف کرده
            # خطرناک نیست — فقط لاگ میکنیم
            logger.warning(
                f"DistributedLock: قفل '{self._lock.name}' "
                f"احتمالاً منقضی شده بود (timeout={self._lock.timeout}s). "
                f"timeout را افزایش دهید."
            )
        except LockError as e:
            logger.error(f"DistributedLock: خطا در آزادسازی قفل '{self._lock.name}': {e}")
        finally:
            self._acquired = False  # همیشه reset — حتی اگه exception بخوره

    # ------------------------------------------------------------------
    def __enter__(self) -> "DistributedLock":
        if not self.acquire():
            raise ValidationError(
                "درخواست شما در حال پردازش است، لطفاً چند لحظه صبر کنید."
            )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        self.release()
        return False  # صریح: exception را suppress نکن، بگذار بالا برود