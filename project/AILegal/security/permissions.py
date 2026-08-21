"""DRF permission classes for RBAC."""

from rest_framework.permissions import BasePermission

from .rbac import normalize_role, user_has_permission


class HasPermission(BasePermission):
    """Require a specific permission codename."""
    permission_codename = ''

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        codename = getattr(view, 'required_permission', None) or self.permission_codename
        if not codename:
            return True
        extra = getattr(request.user, '_extra_permissions', set())
        return user_has_permission(
            request.user.role, codename,
            is_superuser=request.user.is_superuser,
            extra_permissions=extra,
        )


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.is_superuser or request.user.role == 'super_admin'
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('admin', 'super_admin')


class IsLawyer(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('advocate', 'lawyer')


class IsCitizen(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ('user', 'citizen')


class IsVerifiedUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified


class IsEmailVerified(BasePermission):
    message = 'Please verify your email before accessing this resource.'

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_verified


def make_permission(codename: str):
    """Factory for permission classes."""
    class _Perm(HasPermission):
        permission_codename = codename
    _Perm.__name__ = f'HasPermission_{codename}'
    return _Perm
