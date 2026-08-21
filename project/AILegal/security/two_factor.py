"""Two-factor authentication: Email OTP and TOTP."""

import io
import random
import secrets
from datetime import timedelta

import pyotp
import qrcode
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .audit_logger import log_audit
from .models import TwoFactorOTP
from .security_logger import log_security_event
from .utils import hash_token, generate_secure_token


OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = 60


def is_2fa_required(user) -> bool:
    """Admins and lawyers require 2FA; optional for citizens."""
    role = user.role
    if user.is_superuser or role == 'admin':
        return True
    if role in ('advocate', 'lawyer'):
        return True
    return user.two_factor_enabled


def generate_otp_code() -> str:
    return ''.join(str(random.randint(0, 9)) for _ in range(OTP_LENGTH))


def create_email_otp(user, session_key: str = '') -> TwoFactorOTP:
    code = generate_otp_code()
    otp = TwoFactorOTP.objects.create(
        user=user,
        otp_hash=hash_token(code),
        method=TwoFactorOTP.METHOD_EMAIL,
        expires_at=timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES),
        session_key=session_key or generate_secure_token(16),
    )
    return otp, code


def send_otp_email(user, code: str) -> bool:
    subject = 'Your AI Legal Assistant verification code'
    message = (
        f"Hello {user.full_name},\n\n"
        f"Your verification code is: {code}\n\n"
        f"This code expires in {OTP_EXPIRY_MINUTES} minutes.\n"
        f"Do not share this code with anyone."
    )
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return True
    except Exception as exc:
        log_security_event('otp_failure', f'Failed to send OTP: {exc}', None, user.id, user.email)
        return False


def can_resend_otp(user) -> tuple[bool, int]:
    last = TwoFactorOTP.objects.filter(user=user, method=TwoFactorOTP.METHOD_EMAIL).first()
    if not last:
        return True, 0
    elapsed = (timezone.now() - last.created_at).total_seconds()
    if elapsed >= OTP_RESEND_SECONDS:
        return True, 0
    return False, int(OTP_RESEND_SECONDS - elapsed)


def verify_otp(user, code: str, session_key: str = '') -> tuple[bool, str]:
    otp = TwoFactorOTP.objects.filter(
        user=user, verified_at__isnull=True, expires_at__gt=timezone.now()
    ).order_by('-created_at').first()

    if not otp:
        log_security_event('otp_failure', 'No valid OTP found', None, user.id, user.email)
        return False, 'OTP expired or not found. Please request a new one.'

    if session_key and otp.session_key and otp.session_key != session_key:
        log_security_event('otp_failure', 'Session key mismatch', None, user.id, user.email)
        return False, 'Invalid OTP session.'

    otp.attempts += 1
    otp.save(update_fields=['attempts'])

    if otp.attempts > OTP_MAX_ATTEMPTS:
        log_security_event('otp_failure', 'Max OTP attempts exceeded', None, user.id, user.email)
        return False, 'Maximum OTP attempts exceeded. Please request a new code.'

    if hash_token(code.strip()) != otp.otp_hash:
        log_security_event('otp_failure', 'Invalid OTP code', None, user.id, user.email)
        remaining = OTP_MAX_ATTEMPTS - otp.attempts
        return False, f'Invalid OTP. {remaining} attempt(s) remaining.'

    otp.verified_at = timezone.now()
    otp.save(update_fields=['verified_at'])
    log_audit('2fa_verified', user=user, new_value={'method': otp.method})
    return True, 'OTP verified successfully.'


def generate_backup_codes(count: int = 8) -> list:
    """Generate count single-use 8-digit emergency backup scratch codes."""
    return [''.join(secrets.choice('0123456789') for _ in range(8)) for _ in range(count)]


def setup_totp(user) -> dict:
    if not user.totp_secret:
        user.totp_secret = pyotp.random_base32()

    # Generate new set of 8-digit emergency backup scratch codes if none exist or setup re-initiated
    backup_codes = generate_backup_codes(8)
    user.backup_codes = backup_codes
    user.save(update_fields=['totp_secret', 'backup_codes'])

    totp = pyotp.TOTP(user.totp_secret)
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name='AI Legal Assistant')

    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    import base64
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        'secret': user.totp_secret,
        'provisioning_uri': provisioning_uri,
        'qr_code_base64': qr_b64,
        'backup_codes': backup_codes,
    }


def verify_totp(user, code: str) -> bool:
    if not user.totp_secret:
        return False

    clean_code = code.strip()

    # 1. Verify standard TOTP 6-digit code
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(clean_code, valid_window=1):
        return True

    # 2. Verify single-use 8-digit emergency backup scratch code (Google Authenticator libpam standard)
    if user.backup_codes and clean_code in user.backup_codes:
        # Consume/remove single-use backup code
        user.backup_codes.remove(clean_code)
        user.save(update_fields=['backup_codes'])
        log_security_event('backup_code_used', f'Emergency backup code consumed by user {user.email}', None, user.id, user.email)
        return True

    return False


def enable_2fa(user, method: str = 'email') -> None:
    user.two_factor_enabled = True
    user.two_factor_method = method
    user.save(update_fields=['two_factor_enabled', 'two_factor_method'])
    log_audit('2fa_enabled', user=user, new_value={'method': method})


def disable_2fa(user) -> None:
    user.two_factor_enabled = False
    user.two_factor_method = ''
    user.totp_secret = ''
    user.backup_codes = []
    user.save(update_fields=['two_factor_enabled', 'two_factor_method', 'totp_secret', 'backup_codes'])
    log_audit('2fa_disabled', user=user)
