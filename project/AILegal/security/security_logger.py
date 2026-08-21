"""Security event logging to MongoDB."""

from datetime import datetime, timezone
from typing import Any, Optional

from .mongo_client import insert_security_log
from .utils import request_meta


EVENT_TYPES = (
    'failed_login', 'expired_token', 'invalid_token', 'jwt_replay',
    'permission_denied', 'suspicious_activity', 'rate_limit_triggered',
    'csrf_failure', 'cors_failure', 'google_oauth_failure',
    'password_reset_failure', 'otp_failure', 'verification_failure',
)


def log_security_event(
    event_type: str,
    message: str = '',
    request=None,
    user_id: Optional[int] = None,
    email: str = '',
    extra: Optional[dict[str, Any]] = None,
) -> None:
    if event_type not in EVENT_TYPES:
        event_type = 'suspicious_activity'

    meta = request_meta(request) if request else {}
    doc = {
        'event_type': event_type,
        'message': message,
        'user_id': user_id,
        'email': email,
        'ip_address': meta.get('ip_address'),
        'user_agent': meta.get('user_agent'),
        'browser': meta.get('browser'),
        'os': meta.get('os'),
        'timestamp': datetime.now(timezone.utc).isoformat(),
        **(extra or {}),
    }
    insert_security_log('security_logs', doc)
