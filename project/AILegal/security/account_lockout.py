"""Account lockout for brute-force protection."""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import AccountLockout, LoginHistory
from .security_logger import log_security_event


MAX_FAILED_ATTEMPTS = int(getattr(settings, 'ACCOUNT_LOCKOUT_MAX_ATTEMPTS', 5))
LOCKOUT_MINUTES = int(getattr(settings, 'ACCOUNT_LOCKOUT_MINUTES', 15))


def get_or_create_lockout(user) -> AccountLockout:
    lockout, _ = AccountLockout.objects.get_or_create(user=user)
    return lockout


def is_account_locked(user) -> tuple[bool, int]:
    """Return (locked, seconds_remaining)."""
    lockout = get_or_create_lockout(user)
    if lockout.locked_until and lockout.locked_until > timezone.now():
        remaining = int((lockout.locked_until - timezone.now()).total_seconds())
        return True, remaining
    if lockout.locked_until and lockout.locked_until <= timezone.now():
        lockout.failed_attempts = 0
        lockout.locked_until = None
        lockout.save(update_fields=['failed_attempts', 'locked_until'])
    return False, 0


def record_failed_login(user, request=None, email: str = '', reason: str = '') -> tuple[bool, int]:
    """Record failed attempt; return (now_locked, seconds_remaining)."""
    lockout = get_or_create_lockout(user)
    lockout.failed_attempts += 1
    lockout.last_attempt_at = timezone.now()

    locked = False
    remaining = 0
    if lockout.failed_attempts >= MAX_FAILED_ATTEMPTS:
        lockout.locked_until = timezone.now() + timedelta(minutes=LOCKOUT_MINUTES)
        locked = True
        remaining = LOCKOUT_MINUTES * 60
        log_security_event(
            'failed_login', f'Account locked after {MAX_FAILED_ATTEMPTS} attempts',
            request, user.id, user.email
        )
        LoginHistory.objects.create(
            user=user,
            email_attempted=email or user.email,
            status=LoginHistory.STATUS_LOCKED,
            login_method=LoginHistory.METHOD_EMAIL,
            failure_reason=reason or 'Account locked',
            ip_address=getattr(request, '_client_ip', None) if request else None,
        )

    lockout.save()
    return locked, remaining


def reset_lockout(user) -> None:
    lockout = get_or_create_lockout(user)
    lockout.failed_attempts = 0
    lockout.locked_until = None
    lockout.save(update_fields=['failed_attempts', 'locked_until'])


def admin_unlock(user, admin_user) -> None:
    lockout = get_or_create_lockout(user)
    lockout.failed_attempts = 0
    lockout.locked_until = None
    lockout.unlocked_by = admin_user
    lockout.save(update_fields=['failed_attempts', 'locked_until', 'unlocked_by'])
