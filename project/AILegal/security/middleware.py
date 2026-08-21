"""Security middleware: headers, session touch, permission logging."""

import re

from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from .session_manager import touch_session
from .security_logger import log_security_event
from .utils import get_client_ip


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Add security headers to all responses."""

    def process_response(self, request, response):
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if not settings.DEBUG:
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response


class SessionActivityMiddleware(MiddlewareMixin):
    """Update last activity for authenticated sessions."""

    def process_request(self, request):
        request._client_ip = get_client_ip(request)
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            try:
                from rest_framework_simplejwt.tokens import AccessToken
                token = AccessToken(auth_header.split(' ', 1)[1])
                sid = token.get('sid')
                if sid:
                    touch_session(sid)
            except Exception:
                pass


class PermissionDeniedMiddleware(MiddlewareMixin):
    """Log permission denied responses."""

    def process_response(self, request, response):
        if response.status_code == 403 and hasattr(request, 'user') and request.user.is_authenticated:
            log_security_event(
                'permission_denied',
                f'403 on {request.path}',
                request,
                request.user.id,
            )
        return response


class MongoInjectionGuardMiddleware(MiddlewareMixin):
    """Basic MongoDB injection pattern detection in query params."""

    SUSPICIOUS = re.compile(r'(\$where|\$gt|\$lt|\$ne|\$regex|\{\s*\$)', re.I)

    def process_request(self, request):
        for key, value in request.GET.items():
            if self.SUSPICIOUS.search(str(value)):
                log_security_event('suspicious_activity', f'Mongo injection attempt: {key}', request)
                return JsonResponse({'success': False, 'message': 'Invalid request.'}, status=400)
        return None
