"""Session management service."""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from .models import UserSession
from .utils import request_meta, hash_token


SESSION_INACTIVITY_DAYS = int(getattr(settings, 'SESSION_INACTIVITY_DAYS', 7))


def create_session(user, request, jti: str = '', refresh_token: str = '') -> UserSession:
    meta = request_meta(request)
    session = UserSession.objects.create(
        user=user,
        jti=jti,
        refresh_token_hash=hash_token(refresh_token) if refresh_token else '',
        device_fingerprint=meta['fingerprint'],
        browser=meta['browser'],
        os=meta['os'],
        device_type=meta['device_type'],
        ip_address=meta['ip_address'],
        user_agent=meta['user_agent'],
        expires_at=timezone.now() + timedelta(days=SESSION_INACTIVITY_DAYS),
    )
    return session


def touch_session(session_id: str) -> None:
    UserSession.objects.filter(session_id=session_id, is_active=True).update(
        last_activity=timezone.now()
    )


def get_active_sessions(user):
    expire_inactive_sessions(user)
    return UserSession.objects.filter(user=user, is_active=True).order_by('-last_activity')


def revoke_session(user, session_id: str, current_session_id: str = '') -> bool:
    try:
        session = UserSession.objects.get(user=user, session_id=session_id, is_active=True)
    except UserSession.DoesNotExist:
        return False
    session.revoke()
    from .jwt_service import revoke_user_tokens
    if str(session.session_id) != current_session_id:
        from .models import RefreshTokenFamily
        RefreshTokenFamily.objects.filter(session=session).update(is_revoked=True)
    return True


def revoke_all_sessions(user, except_session_id: str = '') -> int:
    sessions = UserSession.objects.filter(user=user, is_active=True)
    if except_session_id:
        sessions = sessions.exclude(session_id=except_session_id)
    count = sessions.count()
    now = timezone.now()
    sessions.update(is_active=False, revoked_at=now)
    from .models import RefreshTokenFamily
    from .jwt_service import revoke_user_tokens
    revoke_user_tokens(user, except_session_id or None)
    return count


def expire_inactive_sessions(user=None) -> int:
    cutoff = timezone.now() - timedelta(days=SESSION_INACTIVITY_DAYS)
    qs = UserSession.objects.filter(is_active=True, last_activity__lt=cutoff)
    if user:
        qs = qs.filter(user=user)
    return qs.update(is_active=False, revoked_at=timezone.now())
