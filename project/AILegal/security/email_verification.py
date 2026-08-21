"""Email verification service."""

from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from .audit_logger import log_audit
from .models import EmailVerificationToken
from .security_logger import log_security_event
from .utils import generate_secure_token, hash_token


VERIFICATION_EXPIRY_HOURS = 24


def create_verification_token(user, request=None) -> str:
    raw_token = generate_secure_token(48)
    EmailVerificationToken.objects.filter(user=user, used_at__isnull=True).update(
        used_at=timezone.now()
    )
    EmailVerificationToken.objects.create(
        user=user,
        token_hash=hash_token(raw_token),
        expires_at=timezone.now() + timedelta(hours=VERIFICATION_EXPIRY_HOURS),
    )
    return raw_token


def send_verification_email(user, request=None) -> bool:
    token = create_verification_token(user, request)
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    verify_url = f"{frontend_url}/verify-email?token={token}"

    subject = 'Verify your AI Legal Assistant account'
    message = (
        f"Hello {user.full_name},\n\n"
        f"Please verify your email by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in {VERIFICATION_EXPIRY_HOURS} hours.\n\n"
        f"If you did not create an account, ignore this email."
    )

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
        log_audit('email_verification_sent', user=user, request=request)
        return True
    except Exception as exc:
        log_security_event('verification_failure', str(exc), request, user.id, user.email)
        return False


def verify_email_token(raw_token: str, request=None):
    token_hash = hash_token(raw_token)
    record = EmailVerificationToken.objects.filter(token_hash=token_hash).select_related('user').first()

    if not record:
        log_security_event('verification_failure', 'Invalid verification token', request)
        return None, 'Invalid or expired verification link.'

    if record.used_at:
        return None, 'This email has already been verified.'

    if record.expires_at < timezone.now():
        log_security_event('verification_failure', 'Expired verification token', request, record.user_id)
        return None, 'Verification link has expired. Please request a new one.'

    user = record.user
    user.is_verified = True
    user.email_verified_at = timezone.now()
    user.save(update_fields=['is_verified', 'email_verified_at'])

    record.used_at = timezone.now()
    record.save(update_fields=['used_at'])

    log_audit('email_verified', user=user, request=request, new_value={'email': user.email})
    return user, 'Email verified successfully. You can now log in.'
