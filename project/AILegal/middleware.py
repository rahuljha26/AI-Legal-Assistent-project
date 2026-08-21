from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from .permissions import user_has_permission


class RBACSecurityMiddleware(MiddlewareMixin):
    """
    Middleware that enforces Role-Based Access Control and Security Headers across all requests.
    """

    PROTECTED_PATH_ROLES = {
        '/api/admin/': ['super_admin', 'admin'],
        '/api/advocate/': ['super_admin', 'admin', 'lawyer', 'advocate'],
        '/api/cases/manage/': ['super_admin', 'admin', 'lawyer', 'advocate'],
    }

    def process_request(self, request):
        # 1. Check if user is authenticated but marked inactive
        if request.user and request.user.is_authenticated:
            if not request.user.is_active:
                return JsonResponse({
                    'success': False,
                    'message': 'Account is deactivated. Please contact support.',
                    'errors': {'code': 'ACCOUNT_DEACTIVATED'}
                }, status=403)

        # 2. Path-level prefix enforcement
        path = request.path
        for prefix, allowed_roles in self.PROTECTED_PATH_ROLES.items():
            if path.startswith(prefix):
                if not request.user or not request.user.is_authenticated:
                    return JsonResponse({
                        'success': False,
                        'message': 'Authentication required for this resource.',
                        'errors': {'code': 'UNAUTHENTICATED'}
                    }, status=401)

                user_role = (getattr(request.user, 'role', '') or '').lower()
                if not request.user.is_superuser and user_role not in allowed_roles:
                    return JsonResponse({
                        'success': False,
                        'message': 'Unauthorized. Access denied for your role.',
                        'errors': {'code': 'FORBIDDEN', 'user_role': user_role, 'required_roles': allowed_roles}
                    }, status=403)

        return None

    def process_response(self, request, response):
        # Apply enterprise security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        return response
