"""Audit logging service."""

from typing import Any, Optional

from django.contrib.auth import get_user_model

from .models import AuditLog
from .mongo_client import insert_security_log
from .utils import request_meta

User = get_user_model()


def log_audit(
    action: str,
    user=None,
    request=None,
    old_value: Any = None,
    new_value: Any = None,
    resource_type: str = '',
    resource_id: str = '',
    session_id: str = '',
) -> AuditLog:
    meta = request_meta(request) if request else {}
    entry = AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id else '',
        old_value=old_value,
        new_value=new_value,
        ip_address=meta.get('ip_address'),
        browser=meta.get('browser', ''),
        os=meta.get('os', ''),
        device_type=meta.get('device_type', ''),
        session_id=session_id,
        user_agent=meta.get('user_agent', ''),
    )

    insert_security_log('audit_logs', {
        'audit_id': entry.id,
        'user_id': user.id if user else None,
        'user_email': user.email if user else None,
        'action': action,
        'resource_type': resource_type,
        'resource_id': str(resource_id) if resource_id else '',
        'old_value': old_value,
        'new_value': new_value,
        'ip_address': meta.get('ip_address'),
        'browser': meta.get('browser'),
        'os': meta.get('os'),
        'device_type': meta.get('device_type'),
        'session_id': session_id,
        'timestamp': entry.created_at.isoformat(),
    })
    return entry
