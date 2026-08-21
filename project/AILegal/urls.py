from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    SignupView, LoginView, ProfileView, ChangePasswordView, LogoutView,
    GoogleAuthView, GoogleConfigStatusView, GitHubAuthView,
    AdviceAskView, AdviceHistoryView, AdviceDetailView, AdvicePDFView,
    DocumentGenerateView, DocumentListView, DocumentDetailView, DocumentPDFView,
    CaseListCreateView, CaseDetailView,
    EmailSendView,
    AdminUsersView, AdminUserVerifyView, AdminUserDeleteView, AdminStatsView,
    IKSearchView, IKDocView, IKCitationsView, IKCitedByView,
    ConstitutionSearchView,
    AnnouncementListView, AdminAnnouncementView,
    NyayaDraftView, NyayaSendView, NyayaSuggestView, NyayaHistoryView,
    YouTubeSearchView, RoleMatrixView, RoleAssignView,
)


from .security_views import (
    VerifyEmailView, ResendVerificationView, SendOTPView, VerifyOTPView,
    SessionListView, SessionDeleteView, LogoutAllView, LoginHistoryView,
    AuditLogView, Manage2FAView
)

urlpatterns = [

    # Security Auth Endpoints
    path('auth/roles/', RoleMatrixView.as_view(), name='auth_roles_matrix'),
    path('auth/assign-role/', RoleAssignView.as_view(), name='auth_assign_role'),
    path('auth/verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='auth_resend_verification'),
    path('auth/send-otp/', SendOTPView.as_view(), name='auth_send_otp'),
    path('auth/verify-otp/', VerifyOTPView.as_view(), name='auth_verify_otp'),
    path('auth/sessions/', SessionListView.as_view(), name='auth_sessions_list'),
    path('auth/session/<int:pk>/', SessionDeleteView.as_view(), name='auth_session_delete'),
    path('auth/logout-all/', LogoutAllView.as_view(), name='auth_logout_all'),
    path('auth/login-history/', LoginHistoryView.as_view(), name='auth_login_history'),
    path('auth/audit-logs/', AuditLogView.as_view(), name='auth_audit_logs'),
    path('auth/2fa/', Manage2FAView.as_view(), name='auth_manage_2fa'),

    # Auth
    path('auth/signup/', SignupView.as_view(), name='auth_signup'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('auth/me/', ProfileView.as_view(), name='auth_me'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/google/config-status/', GoogleConfigStatusView.as_view(), name='google_config_status'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/github/', GitHubAuthView.as_view(), name='github-auth'),

    # Advice
    path('advice/ask/', AdviceAskView.as_view(), name='advice_ask'),
    path('advice/history/', AdviceHistoryView.as_view(), name='advice_history'),
    path('advice/<int:pk>/', AdviceDetailView.as_view(), name='advice_detail'),
    path('advice/<int:pk>/pdf/', AdvicePDFView.as_view(), name='advice_pdf'),

    # Documents
    path('documents/generate/', DocumentGenerateView.as_view(), name='documents_generate'),
    path('documents/', DocumentListView.as_view(), name='documents_list'),
    path('documents/<int:pk>/', DocumentDetailView.as_view(), name='documents_detail'),
    path('documents/<int:pk>/pdf/', DocumentPDFView.as_view(), name='documents_pdf'),

    # Cases
    path('cases/', CaseListCreateView.as_view(), name='cases_list_create'),
    path('cases/<int:pk>/', CaseDetailView.as_view(), name='cases_detail'),

    # Email
    path('email/send/', EmailSendView.as_view(), name='email_send'),

    # Admin
    path('admin/users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin/users/<int:pk>/verify/', AdminUserVerifyView.as_view(), name='admin_user_verify'),
    path('admin/users/<int:pk>/', AdminUserDeleteView.as_view(), name='admin_user_delete'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),

    # Indian Kanoon (Case Law Search)
    path('ik/search/', IKSearchView.as_view(), name='ik_search'),
    path('ik/doc/<int:docid>/', IKDocView.as_view(), name='ik_doc'),
    path('ik/doc/<int:docid>/citations/', IKCitationsView.as_view(), name='ik_citations'),
    path('ik/doc/<int:docid>/citedby/', IKCitedByView.as_view(), name='ik_citedby'),

    # Constitution Search (DB-backed)
    path('constitution/search/', ConstitutionSearchView.as_view(), name='constitution_search'),

    # Announcements / What's New
    path('announcements/', AnnouncementListView.as_view(), name='announcements_list'),
    path('admin/announcements/', AdminAnnouncementView.as_view(), name='admin_announcements_create'),
    path('admin/announcements/<int:pk>/', AdminAnnouncementView.as_view(), name='admin_announcements_delete'),

    # Nyaya Voice Assistant
    path('nyaya/draft/',   NyayaDraftView.as_view(),   name='nyaya_draft'),
    path('nyaya/send/',    NyayaSendView.as_view(),    name='nyaya_send'),
    path('nyaya/suggest/', NyayaSuggestView.as_view(), name='nyaya_suggest'),
    path('nyaya/history/', NyayaHistoryView.as_view(), name='nyaya_history'),

    # YouTube Legal Video Search
    path('youtube/search/', YouTubeSearchView.as_view(), name='youtube_search'),
]
