"""Role-Based Access Control permission matrix and helpers."""

from __future__ import annotations

# Canonical role slugs (maps legacy User.role values)
ROLE_SUPER_ADMIN = 'super_admin'
ROLE_ADMIN = 'admin'
ROLE_LAWYER = 'lawyer'       # maps to advocate
ROLE_CITIZEN = 'citizen'     # maps to user

LEGACY_ROLE_MAP = {
    'admin': ROLE_ADMIN,
    'advocate': ROLE_LAWYER,
    'user': ROLE_CITIZEN,
    'super_admin': ROLE_SUPER_ADMIN,
    'lawyer': ROLE_LAWYER,
    'citizen': ROLE_CITIZEN,
}

DISPLAY_ROLE_MAP = {
    ROLE_SUPER_ADMIN: 'Super Admin',
    ROLE_ADMIN: 'Admin',
    ROLE_LAWYER: 'Lawyer',
    ROLE_CITIZEN: 'Citizen',
}

# Permission codenames
PERMISSIONS = [
    ('manage_everything', 'Manage Everything'),
    ('manage_users', 'Manage Users'),
    ('manage_lawyers', 'Manage Lawyers'),
    ('manage_cases', 'Manage Cases'),
    ('manage_articles', 'Manage Articles'),
    ('view_analytics', 'View Analytics'),
    ('view_assigned_cases', 'View Assigned Cases'),
    ('reply_clients', 'Reply to Clients'),
    ('upload_legal_documents', 'Upload Legal Documents'),
    ('use_ai_assistant', 'AI Legal Assistant'),
    ('ask_legal_questions', 'Ask Legal Questions'),
    ('upload_documents', 'Upload Documents'),
    ('track_cases', 'Track Cases'),
    ('book_lawyer', 'Book Lawyer'),
    ('view_audit_logs', 'View Audit Logs'),
    ('manage_security', 'Manage Security Settings'),
    ('export_audit_logs', 'Export Audit Logs'),
]

PERMISSION_MATRIX: dict[str, set[str]] = {
    ROLE_SUPER_ADMIN: {p[0] for p in PERMISSIONS},
    ROLE_ADMIN: {
        'manage_users', 'manage_lawyers', 'manage_cases', 'manage_articles',
        'view_analytics', 'view_audit_logs', 'export_audit_logs',
    },
    ROLE_LAWYER: {
        'view_assigned_cases', 'reply_clients', 'upload_legal_documents',
        'use_ai_assistant', 'upload_documents',
    },
    ROLE_CITIZEN: {
        'ask_legal_questions', 'upload_documents', 'track_cases',
        'book_lawyer', 'use_ai_assistant',
    },
}

# Frontend route → required permission(s)
ROUTE_PERMISSIONS: dict[str, list[str]] = {
    '/admin/dashboard': ['view_analytics'],
    '/admin/security': ['manage_security'],
    '/admin/users': ['manage_users'],
    '/admin/audit-logs': ['view_audit_logs'],
    '/advocate/dashboard': ['view_assigned_cases'],
    '/documents': ['upload_documents'],
    '/dashboard': ['ask_legal_questions'],
    '/profile': [],
    '/security/settings': [],
    '/security/sessions': [],
    '/security/login-history': [],
}


def normalize_role(role: str, is_superuser: bool = False) -> str:
    if is_superuser:
        return ROLE_SUPER_ADMIN
    return LEGACY_ROLE_MAP.get(role, role)


def user_has_permission(role: str, permission: str, is_superuser: bool = False,
                        extra_permissions: set[str] | None = None) -> bool:
    canonical = normalize_role(role, is_superuser)
    perms = set(PERMISSION_MATRIX.get(canonical, set()))
    if extra_permissions:
        perms |= extra_permissions
    if 'manage_everything' in perms:
        return True
    return permission in perms


def get_role_permissions(role: str, is_superuser: bool = False) -> list[str]:
    canonical = normalize_role(role, is_superuser)
    return sorted(PERMISSION_MATRIX.get(canonical, set()))
