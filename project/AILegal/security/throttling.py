"""Rate limiting throttles."""

from rest_framework.throttling import AnonRateThrottle, UserRateThrottle, SimpleRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class SignupRateThrottle(AnonRateThrottle):
    scope = 'signup'


class OTPRateThrottle(UserRateThrottle):
    scope = 'otp'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class AuthRefreshRateThrottle(AnonRateThrottle):
    scope = 'token_refresh'
