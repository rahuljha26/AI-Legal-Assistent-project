"""Security models: RBAC, sessions, 2FA, verification, lockout, audit."""

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


class Role(models.Model):
    """RBAC role definition."""
    slug = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_roles'

    def __str__(self):
        return self.name


class Permission(models.Model):
    """RBAC permission definition."""
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_permissions'

    def __str__(self):
        return self.codename


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='role_permissions')

    class Meta:
        db_table = 'security_role_permissions'
        unique_together = ('role', 'permission')


class UserRole(models.Model):
    """Maps users to RBAC roles (supports multiple roles)."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_roles'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_user_roles'
        unique_together = ('user', 'role')


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='verification_tokens')
    token_hash = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_email_verification_tokens'

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()


class PasswordResetToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token_hash = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_password_reset_tokens'

    @property
    def is_valid(self):
        return self.used_at is None and self.expires_at > timezone.now()


class TwoFactorOTP(models.Model):
    METHOD_EMAIL = 'email'
    METHOD_TOTP = 'totp'
    METHOD_CHOICES = ((METHOD_EMAIL, 'Email OTP'), (METHOD_TOTP, 'TOTP'))

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='otp_records')
    otp_hash = models.CharField(max_length=128)
    method = models.CharField(max_length=10, choices=METHOD_CHOICES, default=METHOD_EMAIL)
    attempts = models.PositiveSmallIntegerField(default=0)
    max_attempts = models.PositiveSmallIntegerField(default=5)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    session_key = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_two_factor_otps'
        ordering = ['-created_at']


class UserSession(models.Model):
    """Active session tracking with device binding."""
    session_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions')
    jti = models.CharField(max_length=255, blank=True, db_index=True)
    refresh_token_hash = models.CharField(max_length=128, blank=True, db_index=True)
    device_fingerprint = models.CharField(max_length=128)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    user_agent = models.TextField(blank=True)
    login_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'security_user_sessions'
        ordering = ['-last_activity']

    def revoke(self):
        self.is_active = False
        self.revoked_at = timezone.now()
        self.save(update_fields=['is_active', 'revoked_at'])


class LoginHistory(models.Model):
    STATUS_SUCCESS = 'success'
    STATUS_FAILED = 'failed'
    STATUS_LOCKED = 'locked'
    STATUS_CHOICES = (
        (STATUS_SUCCESS, 'Success'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_LOCKED, 'Locked'),
    )

    METHOD_EMAIL = 'email'
    METHOD_GOOGLE = 'google'
    METHOD_GITHUB = 'github'
    METHOD_2FA = '2fa'
    METHOD_CHOICES = (
        (METHOD_EMAIL, 'Email'),
        (METHOD_GOOGLE, 'Google'),
        (METHOD_GITHUB, 'GitHub'),
        (METHOD_2FA, '2FA'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='login_history', null=True, blank=True
    )
    email_attempted = models.EmailField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    login_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default=METHOD_EMAIL)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    failure_reason = models.CharField(max_length=255, blank=True)
    session = models.ForeignKey(UserSession, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_login_history'
        ordering = ['-created_at']


class AuditLog(models.Model):
    """Immutable audit trail for sensitive actions."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='audit_logs'
    )
    action = models.CharField(max_length=100, db_index=True)
    resource_type = models.CharField(max_length=100, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    device_type = models.CharField(max_length=50, blank=True)
    session_id = models.CharField(max_length=64, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'security_audit_logs'
        ordering = ['-created_at']


class AccountLockout(models.Model):
    """Brute-force protection state per user."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lockout')
    failed_attempts = models.PositiveSmallIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    locked_until = models.DateTimeField(null=True, blank=True)
    unlocked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='unlocked_accounts'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_account_lockouts'

    @property
    def is_locked(self):
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False


class RefreshTokenFamily(models.Model):
    """Tracks refresh token rotation to detect reuse."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='token_families')
    family_id = models.UUIDField(default=uuid.uuid4, unique=True)
    current_token_hash = models.CharField(max_length=128)
    previous_token_hash = models.CharField(max_length=128, blank=True)
    device_fingerprint = models.CharField(max_length=128, blank=True)
    session = models.ForeignKey(UserSession, on_delete=models.SET_NULL, null=True, blank=True)
    is_revoked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    rotated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_refresh_token_families'
