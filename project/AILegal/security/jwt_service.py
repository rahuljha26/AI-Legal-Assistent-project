"""Enhanced JWT service with rotation, fingerprinting, and device binding."""

from datetime import timedelta
from typing import Optional

from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from .models import RefreshTokenFamily, UserSession
from .utils import hash_token, generate_session_id, request_meta


def create_tokens_for_user(user, request, session: Optional[UserSession] = None) -> dict:
    """Issue access + refresh tokens with custom claims."""
    meta = request_meta(request)
    refresh = RefreshToken.for_user(user)

    refresh['role'] = user.role
    refresh['email'] = user.email
    refresh['fp'] = meta['fingerprint']
    refresh['sid'] = str(session.session_id) if session else generate_session_id()

    access = refresh.access_token
    access['role'] = user.role
    access['email'] = user.email
    access['fp'] = meta['fingerprint']
    access['sid'] = refresh['sid']

    refresh_str = str(refresh)
    RefreshTokenFamily.objects.create(
        user=user,
        current_token_hash=hash_token(refresh_str),
        device_fingerprint=meta['fingerprint'],
        session=session,
    )

    return {
        'access': str(access),
        'refresh': refresh_str,
        'jti': str(refresh.get('jti', '')),
        'session_id': refresh['sid'],
    }


def rotate_refresh_token(old_refresh_str: str, request) -> Optional[dict]:
    """Rotate refresh token; revoke family on reuse detection."""
    meta = request_meta(request)
    old_hash = hash_token(old_refresh_str)

    try:
        family = RefreshTokenFamily.objects.filter(
            current_token_hash=old_hash, is_revoked=False
        ).select_related('user', 'session').first()

        if not family:
            prev = RefreshTokenFamily.objects.filter(previous_token_hash=old_hash).first()
            if prev:
                RefreshTokenFamily.objects.filter(user=prev.user, is_revoked=False).update(is_revoked=True)
                from .security_logger import log_security_event
                log_security_event('jwt_replay', 'Refresh token reuse detected', request, prev.user_id)
                return None
            return None

        if family.device_fingerprint and family.device_fingerprint != meta['fingerprint']:
            from .security_logger import log_security_event
            log_security_event('suspicious_activity', 'Device fingerprint mismatch on refresh', request, family.user_id)

        token = RefreshToken(old_refresh_str)
        user = family.user
        new_refresh = RefreshToken.for_user(user)
        new_refresh['role'] = user.role
        new_refresh['email'] = user.email
        new_refresh['fp'] = meta['fingerprint']
        new_refresh['sid'] = str(family.session.session_id) if family.session else generate_session_id()

        new_access = new_refresh.access_token
        new_access['role'] = user.role
        new_access['email'] = user.email
        new_access['fp'] = meta['fingerprint']
        new_access['sid'] = new_refresh['sid']

        new_refresh_str = str(new_refresh)
        family.previous_token_hash = old_hash
        family.current_token_hash = hash_token(new_refresh_str)
        family.device_fingerprint = meta['fingerprint']
        family.save()

        try:
            token.blacklist()
        except TokenError:
            pass

        return {
            'access': str(new_access),
            'refresh': new_refresh_str,
        }
    except TokenError:
        from .security_logger import log_security_event
        log_security_event('invalid_token', 'Invalid refresh token', request)
        return None


def revoke_user_tokens(user, session_id: Optional[str] = None) -> int:
    """Revoke all refresh token families for user."""
    qs = RefreshTokenFamily.objects.filter(user=user, is_revoked=False)
    count = qs.update(is_revoked=True)

    sessions = UserSession.objects.filter(user=user, is_active=True)
    if session_id:
        sessions = sessions.exclude(session_id=session_id)
    sessions.update(is_active=False, revoked_at=timezone.now())
    return count
