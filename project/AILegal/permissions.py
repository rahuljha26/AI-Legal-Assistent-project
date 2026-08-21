from functools import wraps
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


# ─── PERMISSION MATRIX ────────────────────────────────────────────────────────
ROLE_PERMISSION_MATRIX = {
    'super_admin': [
        '*',
        'users.manage',
        'lawyers.manage',
        'cases.manage',
        'articles.manage',
        'analytics.view',
        'cases.view_assigned',
        'clients.reply',
        'documents.upload',
        'ai_assistant.use',
        'questions.ask',
        'cases.track',
        'lawyer.book',
        'audit_logs.view',
        'settings.manage',
    ],
    'admin': [
        'users.manage',
        'lawyers.manage',
        'cases.manage',
        'articles.manage',
        'analytics.view',
        'audit_logs.view',
    ],
    'lawyer': [
        'cases.view_assigned',
        'clients.reply',
        'documents.upload',
        'ai_assistant.use',
        'cases.track',
    ],
    'advocate': [  # Alias for lawyer
        'cases.view_assigned',
        'clients.reply',
        'documents.upload',
        'ai_assistant.use',
        'cases.track',
    ],
    'citizen': [
        'questions.ask',
        'documents.upload',
        'cases.track',
        'lawyer.book',
        'ai_assistant.use',
    ],
    'user': [  # Alias for citizen
        'questions.ask',
        'documents.upload',
        'cases.track',
        'lawyer.book',
        'ai_assistant.use',
    ],
}


def user_has_permission(user, permission_code):
    """
    Check if a user has a specific permission code based on their role or assigned permissions.
    """
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    role = (getattr(user, 'role', None) or 'citizen').lower()
    role_perms = ROLE_PERMISSION_MATRIX.get(role, [])

    if '*' in role_perms or permission_code in role_perms:
        return True

    # Check DB-mapped role permissions if available
    try:
        user_roles = user.user_roles.all()
        for ur in user_roles:
            role_perms_db = ur.role.permissions.values_list('permission__code_name', flat=True)
            if permission_code in role_perms_db:
                return True
    except Exception:
        pass

    return False


def get_user_permissions(user):
    """
    Returns a list of all permission codes assigned to a user.
    """
    if not user or not user.is_authenticated:
        return []

    role = (getattr(user, 'role', None) or 'citizen').lower()
    perms = set(ROLE_PERMISSION_MATRIX.get(role, []))

    try:
        user_roles = user.user_roles.all()
        for ur in user_roles:
            for rp in ur.role.permissions.all():
                perms.add(rp.permission.code_name)
    except Exception:
        pass

    return list(perms)


# ─── DRF PERMISSION CLASSES ───────────────────────────────────────────────────

class HasRolePermission(permissions.BasePermission):
    """
    DRF permission class that checks for a specific permission code specified on the view class as `required_permission`.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            return True

        return user_has_permission(request.user, required_perm)


class IsSuperAdmin(permissions.BasePermission):
    """
    Allows access only to Super Admins or Django Superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_super_admin)


class IsAdminUserRole(permissions.BasePermission):
    """
    Allows access to Admins, Super Admins, and Django Staff users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_user)


class IsLawyerUserRole(permissions.BasePermission):
    """
    Allows access to Lawyers (Advocates), Admins, and Super Admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_lawyer_user)


class IsCitizenUserRole(permissions.BasePermission):
    """
    Allows access to verified active users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_citizen_user)


# ─── PYTHON DECORATORS ────────────────────────────────────────────────────────

def require_permission(permission_code):
    """
    Decorator for view methods/functions to enforce granular permission checks.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if not user_has_permission(user, permission_code):
                raise PermissionDenied(f"Permission '{permission_code}' required.")
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator


def require_role(*roles):
    """
    Decorator for view methods/functions to enforce allowed role checks.
    """
    allowed_roles = [r.lower() for r in roles]
    # Expand aliases
    if 'lawyer' in allowed_roles and 'advocate' not in allowed_roles:
        allowed_roles.append('advocate')
    if 'citizen' in allowed_roles and 'user' not in allowed_roles:
        allowed_roles.append('user')

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = getattr(request, 'user', None)
            if not user or not user.is_authenticated:
                raise PermissionDenied("Authentication required.")

            user_role = (getattr(user, 'role', '') or '').lower()
            if not user.is_superuser and user_role not in allowed_roles:
                raise PermissionDenied(f"Role in {roles} required.")
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
