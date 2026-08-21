"""View decorators for permission checks."""

from functools import wraps

from rest_framework.response import Response
from rest_framework import status

from .rbac import user_has_permission
from .security_logger import log_security_event


def require_permission(codename: str):
    """Decorator for function-based views."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                return Response({'success': False, 'message': 'Authentication required.'},
                                status=status.HTTP_401_UNAUTHORIZED)
            if not user_has_permission(user.role, codename, is_superuser=user.is_superuser):
                log_security_event('permission_denied', f'Missing permission: {codename}', request, user.id)
                return Response({'success': False, 'message': 'Permission denied.'},
                                status=status.HTTP_403_FORBIDDEN)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_role(*roles):
    """Decorator requiring one of the specified roles."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                return Response({'success': False, 'message': 'Authentication required.'},
                                status=status.HTTP_401_UNAUTHORIZED)
            if user.is_superuser:
                return view_func(request, *args, **kwargs)
            if user.role not in roles:
                log_security_event('permission_denied', f'Role {user.role} not in {roles}', request, user.id)
                return Response({'success': False, 'message': 'Permission denied.'},
                                status=status.HTTP_403_FORBIDDEN)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
