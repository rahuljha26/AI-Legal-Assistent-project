"""Security utility helpers — device parsing, IP extraction, tokens."""

import hashlib
import secrets
import uuid
from typing import Any

from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str:
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '0.0.0.0')


def get_user_agent(request: HttpRequest) -> str:
    return request.META.get('HTTP_USER_AGENT', '')[:512]


def parse_device_info(user_agent: str) -> dict[str, str]:
    """Parse browser, OS, and device type from user agent."""
    ua = user_agent.lower()
    browser = 'Unknown'
    os_name = 'Unknown'
    device_type = 'Desktop'

    if 'mobile' in ua or 'android' in ua and 'mobile' in ua:
        device_type = 'Mobile'
    elif 'tablet' in ua or 'ipad' in ua:
        device_type = 'Tablet'

    if 'edg/' in ua or 'edge' in ua:
        browser = 'Edge'
    elif 'chrome' in ua and 'chromium' not in ua:
        browser = 'Chrome'
    elif 'firefox' in ua:
        browser = 'Firefox'
    elif 'safari' in ua and 'chrome' not in ua:
        browser = 'Safari'
    elif 'opera' in ua or 'opr/' in ua:
        browser = 'Opera'

    if 'windows' in ua:
        os_name = 'Windows'
    elif 'mac os' in ua or 'macintosh' in ua:
        os_name = 'macOS'
    elif 'android' in ua:
        os_name = 'Android'
    elif 'iphone' in ua or 'ipad' in ua:
        os_name = 'iOS'
    elif 'linux' in ua:
        os_name = 'Linux'

    return {'browser': browser, 'os': os_name, 'device_type': device_type}


def generate_secure_token(length: int = 64) -> str:
    return secrets.token_urlsafe(length)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_session_id() -> str:
    return str(uuid.uuid4())


def token_fingerprint(user_agent: str, ip: str) -> str:
    raw = f"{user_agent}|{ip}"
    return hashlib.sha256(raw.encode()).hexdigest()


def mask_email(email: str) -> str:
    if '@' not in email:
        return email
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked = local[0] + '*'
    else:
        masked = local[0] + '*' * (len(local) - 2) + local[-1]
    return f"{masked}@{domain}"


def request_meta(request: HttpRequest) -> dict[str, Any]:
    ip = get_client_ip(request)
    ua = get_user_agent(request)
    device = parse_device_info(ua)
    return {
        'ip_address': ip,
        'user_agent': ua,
        'browser': device['browser'],
        'os': device['os'],
        'device_type': device['device_type'],
        'fingerprint': token_fingerprint(ua, ip),
    }
