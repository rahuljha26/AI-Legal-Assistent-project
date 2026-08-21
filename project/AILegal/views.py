import os
import json
import smtplib
import time
import logging

logger = logging.getLogger(__name__)
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, date
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests as http_requests

from django.utils import timezone
from django.conf import settings
from django.shortcuts import render, redirect
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User, AdviceHistory, Document, Case, EmailLog, ConstitutionArticle, Announcement, NyayaEmailLog
from .serializers import (
    SignupSerializer, LoginSerializer, UserSerializer,
    ChangePasswordSerializer, AdviceAskSerializer, AdviceHistorySerializer,
    DocumentGenerateSerializer, DocumentSerializer,
    CaseSerializer, EmailSendSerializer, AdminUserSerializer,
    AnnouncementSerializer,
    NyayaDraftSerializer, NyayaSendSerializer, NyayaEmailLogSerializer,
)
from .services import get_gemini_advice, generate_legal_document_text, create_pdf_buffer


# ─── Helpers ──────────────────────────────────────────────────────────────────

def success(data=None, message='', status_code=status.HTTP_200_OK):
    return Response({'success': True, 'data': data, 'message': message}, status=status_code)


def error(message='', status_code=status.HTTP_400_BAD_REQUEST, errors=None):
    return Response({'success': False, 'data': None, 'message': message, 'errors': errors or {}},
                    status=status_code)


def is_advocate(user):
    return user.role == 'advocate'


def is_admin(user):
    return user.role == 'admin'


# ─── Auth Views ───────────────────────────────────────────────────────────────

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)

        email = serializer.validated_data['email'].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            return error('An account with this email already exists.', status.HTTP_400_BAD_REQUEST)

        # Force lowercase email before saving
        serializer.validated_data['email'] = email
        user = serializer.save()
        return success(
            data={'user': UserSerializer(user).data},
            message='Account created successfully.',
            status_code=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        password = request.data.get("password", "")

        if not email or not password:
            return Response({
                "success": False,
                "data": {},
                "message": "Email and password are required."
            }, status=400)

        # Find user in DB by email (case-insensitive)
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({
                "success": False,
                "data": {},
                "message": "No account found with this email address. Please sign up first."
            }, status=401)

        # Check password hash
        if not user.check_password(password):
            return Response({
                "success": False,
                "data": {},
                "message": "Incorrect password. Please try again."
            }, status=401)

        # Check account is active
        if not user.is_active:
            return Response({
                "success": False,
                "data": {},
                "message": "Your account has been deactivated."
            }, status=403)

        # Generate JWT tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)

        return Response({
            "success": True,
            "data": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": str(user.id),
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "profile_picture": user.profile_picture,
                }
            },
            "message": "Login successful"
        }, status=200)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return success(data=UserSerializer(request.user).data, message='Profile retrieved.')

    def patch(self, request):
        allowed_fields = {'full_name'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        user = request.user
        for field, value in data.items():
            setattr(user, field, value)
        user.save()
        return success(data=UserSerializer(user).data, message='Profile updated.')


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)

        user = request.user
        if not user.check_password(serializer.validated_data['current_password']):
            return error('Current password is incorrect.', status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return success(message='Password updated successfully.')


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token') or request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return success(message='Logged out successfully.')
        except TokenError:
            return success(message='Logged out.')


class GoogleAuthView(APIView):
    """
    POST /api/v1/auth/google/
    Body: { "token": "<Google ID token from frontend>" }

    Flow:
      1. Verify Google JWT token using google-auth library
      2. Validate issuer, audience, expiration, email verification
      3. Find user by google_id or verified email in database
      4. Create user if new (default role: 'citizen'), or link Google account safely
      5. Save google_id, email, name, profile_picture, auth_provider, last_login
      6. Return Django JWT access + refresh tokens
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            logger.warning("[GOOGLE_AUTH] Stage: TOKEN_VALIDATION Status: FAILED Reason: missing_token")
            return error("Google token is required", 400)

        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '') or os.environ.get('GOOGLE_CLIENT_ID', '')

        try:
            # Verify the Google ID token using Google's official auth library with clock skew tolerance
            payload = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                google_client_id if google_client_id else None,
                clock_skew_in_seconds=60,
            )
        except ValueError as e:
            logger.warning(f"[GOOGLE_AUTH] Stage: TOKEN_VALIDATION Status: FAILED Reason: {str(e)}")
            return error(f"Google account verification failed: {str(e)}", 401)
        except Exception as e:
            logger.error(f"[GOOGLE_AUTH] Stage: TOKEN_VALIDATION Status: FAILED Reason: {str(e)}")
            return error("Server authentication failed during Google token verification", 500)

        # Validate issuer
        issuer = payload.get("iss", "")
        if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
            logger.warning(f"[GOOGLE_AUTH] Stage: TOKEN_VALIDATION Status: FAILED Reason: invalid_issuer_{issuer}")
            return error("Invalid token issuer", 401)

        # Extract user info from Google payload
        google_sub     = payload.get("sub", "")
        google_email   = payload.get("email", "").lower().strip()
        google_name    = payload.get("name", "Google User")
        is_verified    = payload.get("email_verified", False)
        google_picture = payload.get("picture", "")

        if not google_email:
            logger.warning("[GOOGLE_AUTH] Stage: USER_CHECK Status: FAILED Reason: missing_email")
            return error("Google account has no email address", 400)

        if not is_verified:
            logger.warning(f"[GOOGLE_AUTH] Stage: USER_CHECK Status: FAILED Reason: unverified_email_{google_email}")
            return error("Google email address is not verified", 400)

        # 1. Find user by google_id
        user = None
        created = False
        if google_sub:
            user = User.objects.filter(google_id=google_sub).first()

        # 2. If not found, find user by verified email
        if not user:
            user = User.objects.filter(email__iexact=google_email).first()
            if user:
                # Link existing user safely
                user.google_id = google_sub or user.google_id
                user.auth_provider = user.auth_provider or 'google'
            else:
                # 3. Create new user with default role 'citizen'
                user = User.objects.create_user(
                    email=google_email,
                    password=None,
                    full_name=google_name,
                    role='citizen',
                    is_verified=True,
                    profile_picture=google_picture,
                    google_id=google_sub,
                    auth_provider='google',
                )
                created = True

        # Update profile & last login
        update_fields = ['last_login']
        user.last_login = timezone.now()

        if not created:
            if google_sub and user.google_id != google_sub:
                user.google_id = google_sub
                update_fields.append('google_id')
            if google_name and (not user.full_name or user.full_name == 'Google User'):
                user.full_name = google_name
                update_fields.append('full_name')
            if google_picture and user.profile_picture != google_picture:
                user.profile_picture = google_picture
                update_fields.append('profile_picture')
            if not user.is_verified:
                user.is_verified = True
                update_fields.append('is_verified')

        user.save(update_fields=update_fields)

        # Check account is active
        if not user.is_active:
            logger.warning(f"[GOOGLE_AUTH] Stage: ACCOUNT_STATUS Status: FAILED Reason: account_deactivated_{user.email}")
            return error("Your account has been deactivated. Contact support.", 403)

        # Check if 2FA is enabled for this user
        if user.two_factor_enabled:
            logger.info(f"[GOOGLE_AUTH] Stage: 2FA_REQUIRED User: {user.email}")
            return Response({
                "success": True,
                "data": {
                    "requires_2fa": True,
                    "email": user.email,
                    "two_factor_method": user.two_factor_method
                },
                "message": "Two-factor authentication required."
            })

        # Generate Django JWT tokens
        refresh = RefreshToken.for_user(user)

        logger.info(f"[GOOGLE_AUTH] Stage: COMPLETED Status: SUCCESS User: {user.email} Role: {user.role} Created: {created}")

        return success(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "role": user.role,
                    "role_code": user.get_role_code(),
                    "is_verified": user.is_verified,
                    "profile_picture": user.profile_picture,
                },
                "is_new_user": created,
            },
            f"{'Welcome to AI Legal Assistant!' if created else 'Welcome back!'} Signed in with Google.",
        )


class GoogleConfigStatusView(APIView):
    """
    GET /api/v1/auth/google/config-status/
    Development-only diagnostic status endpoint.
    NEVER exposes secrets or tokens.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '') or os.environ.get('GOOGLE_CLIENT_ID', '')
        client_secret = os.environ.get('GOOGLE_CLIENT_SECRET', '')
        redirect_uri = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5173/oauth/google/callback')

        return Response({
            "google_client_id_configured": bool(client_id),
            "google_client_secret_configured": bool(client_secret),
            "redirect_uri_configured": bool(redirect_uri),
            "oauth_enabled": bool(client_id),
        }, status=200)


class GitHubAuthView(APIView):
    """
    POST /api/v1/auth/github/
    Body: { "code": "<GitHub OAuth authorization code>" }

    Flow:
      1. Exchange the GitHub authorization code for an access token
      2. Fetch the authenticated user's profile from GitHub API
      3. Get the user's primary email (if not public)
      4. Find or create user in the database
      5. Return Django JWT access + refresh tokens
    """
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return error("GitHub authorization code is required", 400)

        github_client_id     = settings.GITHUB_CLIENT_ID
        github_client_secret = settings.GITHUB_CLIENT_SECRET

        if not github_client_id or not github_client_secret:
            return error("GitHub OAuth is not configured on the server", 500)

        # Step 1: Exchange code for access token
        token_response = http_requests.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id":     github_client_id,
                "client_secret": github_client_secret,
                "code":          code,
            },
            headers={"Accept": "application/json"},
            timeout=10,
        )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            return error(
                f"GitHub token exchange failed: {token_data.get('error_description', 'Unknown error')}",
                401,
            )

        gh_headers = {"Authorization": f"token {access_token}", "Accept": "application/json"}

        # Step 2: Fetch GitHub user profile
        profile_resp = http_requests.get("https://api.github.com/user", headers=gh_headers, timeout=10)
        if profile_resp.status_code != 200:
            return error("Failed to fetch GitHub profile", 401)

        profile = profile_resp.json()

        # Step 3: Fetch primary verified email (email may be null in public profile)
        gh_email = profile.get("email")
        if not gh_email:
            emails_resp = http_requests.get(
                "https://api.github.com/user/emails", headers=gh_headers, timeout=10
            )
            if emails_resp.status_code == 200:
                for entry in emails_resp.json():
                    if entry.get("primary") and entry.get("verified"):
                        gh_email = entry["email"]
                        break

        if not gh_email:
            return error(
                "Your GitHub account does not have a verified email address. "
                "Please add a public verified email on GitHub and try again.",
                400,
            )

        gh_email    = gh_email.lower().strip()
        gh_name     = profile.get("name") or profile.get("login") or "GitHub User"
        gh_username = profile.get("login", "")
        gh_picture  = profile.get("avatar_url", "")

        # Step 4: Find or create user
        user, created = User.objects.get_or_create(
            email=gh_email,
            defaults={
                "full_name":   gh_name,
                "role":        "user",
                "is_verified": True,
                "profile_picture": gh_picture,
            },
        )

        if not created:
            updated = False
            if not user.full_name:
                user.full_name   = gh_name
                updated = True
            if gh_picture and user.profile_picture != gh_picture:
                user.profile_picture = gh_picture
                updated = True
            if not user.is_verified:
                user.is_verified = True
                updated = True
            if updated:
                user.save()

        if not user.is_active:
            return error("Your account has been deactivated. Contact support.", 403)

        # Step 5: Generate Django JWT tokens
        refresh = RefreshToken.for_user(user)

        return success(
            {
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id":          user.id,
                    "full_name":   user.full_name,
                    "email":       user.email,
                    "role":        user.role,
                    "is_verified": user.is_verified,
                    "profile_picture": user.profile_picture,
                },
                "github_username": gh_username,
                "is_new_user": created,
            },
            f"{'Welcome to AI Legal Assistant!' if created else 'Welcome back!'} Signed in with GitHub.",
        )


# ─── Advice Views ─────────────────────────────────────────────────────────────

class AdviceAskView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]

    def post(self, request):
        serializer = AdviceAskSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        queries_today = AdviceHistory.objects.filter(
            user=request.user,
            created_at__gte=today_start,
        ).count()

        if queries_today >= 20:
            return error(
                'Daily limit of 20 queries reached. Try again tomorrow.',
                status.HTTP_429_TOO_MANY_REQUESTS,
            )

        query = serializer.validated_data['query']
        file = serializer.validated_data.get('file')

        if file:
            try:
                import PyPDF2
                pdf_reader = PyPDF2.PdfReader(file)
                pdf_text = ""
                for page in pdf_reader.pages:
                    pdf_text += page.extract_text() + "\n"
                query = f"{query}\n\n[Attached Document Content:]\n{pdf_text}"
            except Exception as e:
                return error(f'Error reading PDF file: {str(e)}', status.HTTP_400_BAD_REQUEST)

        ai_response = get_gemini_advice(query)

        if 'error' in ai_response:
            return error('AI engine error.', status.HTTP_500_INTERNAL_SERVER_ERROR, ai_response)

        advice = AdviceHistory.objects.create(
            user=request.user,
            query=query,
            constitution_reference=ai_response.get('constitution_reference'),
            ai_response=ai_response,
        )

        return success(
            data={
                'advice': AdviceHistorySerializer(advice).data,
                'queries_remaining': 20 - queries_today - 1,
            },
            message='Advice generated and saved.',
        )


class AdviceHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = 10
        qs = AdviceHistory.objects.filter(user=request.user)
        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        items = qs[start:end]
        return success(
            data={
                'results': AdviceHistorySerializer(items, many=True).data,
                'total': total,
                'page': page,
                'pages': (total + page_size - 1) // page_size,
            },
            message='Advice history retrieved.',
        )


class AdviceDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_advice(self, pk, user):
        try:
            return AdviceHistory.objects.get(id=pk, user=user)
        except AdviceHistory.DoesNotExist:
            return None

    def get(self, request, pk):
        advice = self._get_advice(pk, request.user)
        if not advice:
            return error('Advice not found.', status.HTTP_404_NOT_FOUND)
        return success(data=AdviceHistorySerializer(advice).data, message='Advice retrieved.')

    def delete(self, request, pk):
        advice = self._get_advice(pk, request.user)
        if not advice:
            return error('Advice not found.', status.HTTP_404_NOT_FOUND)
        advice.delete()
        return success(message='Advice deleted.')


class AdvicePDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse
        try:
            advice = AdviceHistory.objects.get(id=pk)
        except AdviceHistory.DoesNotExist:
            return error('Advice not found.', status.HTTP_404_NOT_FOUND)

        if advice.user != request.user and not is_admin(request.user):
            return error('Unauthorized.', status.HTTP_403_FORBIDDEN)

        content = advice.ai_response
        lines = [
            "AI LEGAL ADVICE REPORT",
            "=" * 50,
            f"Query: {advice.query}",
            "",
        ]
        
        if content.get('constitution_reference'):
            lines.append(f"Constitution Reference: {content['constitution_reference']}")
        if content.get('applicable_law'):
            lines.append(f"Applicable Law: {content['applicable_law']}")
            
        steps = content.get('steps_to_take', [])
        if steps:
            lines += ["", "STEPS TO TAKE:", "-" * 30]
            for i, s in enumerate(steps, 1):
                lines.append(f"  {i}. {s}")
                
        docs = content.get('documents_required', [])
        if docs:
            lines += ["", "DOCUMENTS REQUIRED:", "-" * 30]
            for d in docs:
                lines.append(f"  • {d}")
                
        if content.get('where_to_file'):
            lines += ["", f"Where to File: {content['where_to_file']}"]
            
        if content.get('possible_outcomes'):
            lines += ["", "Possible Outcomes:", "-" * 30]
            for o in content['possible_outcomes']:
                lines.append(f"  • {o}")
                
        lines += ["", "-" * 50, content.get('disclaimer', 'This is for informational purposes only. Consult a licensed advocate.')]
        
        pdf_text = "\n".join(lines)
        buffer = create_pdf_buffer(pdf_text)
        
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Legal_Advice_{advice.id}.pdf"'
        return response




# ─── Document Views ───────────────────────────────────────────────────────────

class DocumentGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DocumentGenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)

        doc_type = serializer.validated_data['document_type']
        details = serializer.validated_data['details']
        generated_text = generate_legal_document_text(doc_type, details)

        doc = Document.objects.create(
            user=request.user,
            document_type=doc_type,
            input_data=details,
            generated_text=generated_text,
        )

        return success(
            data=DocumentSerializer(doc).data,
            message='Document generated and saved to MongoDB.',
            status_code=status.HTTP_201_CREATED,
        )


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        docs = Document.objects.filter(user=request.user)
        return success(data=DocumentSerializer(docs, many=True).data, message='Documents retrieved.')


class DocumentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_doc(self, pk, user):
        try:
            return Document.objects.get(id=pk, user=user)
        except Document.DoesNotExist:
            return None

    def get(self, request, pk):
        doc = self._get_doc(pk, request.user)
        if not doc:
            return error('Document not found.', status.HTTP_404_NOT_FOUND)
        return success(data=DocumentSerializer(doc).data, message='Document retrieved.')

    def delete(self, request, pk):
        doc = self._get_doc(pk, request.user)
        if not doc:
            return error('Document not found.', status.HTTP_404_NOT_FOUND)
        doc.delete()
        return success(message='Document deleted.')


class DocumentPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from django.http import HttpResponse
        try:
            doc = Document.objects.get(id=pk)
        except Document.DoesNotExist:
            return error('Document not found.', status.HTTP_404_NOT_FOUND)

        if doc.user != request.user and not is_admin(request.user):
            return error('Unauthorized.', status.HTTP_403_FORBIDDEN)

        buffer = create_pdf_buffer(doc.generated_text)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{doc.document_type}.pdf"'
        return response


# ─── Case Views ───────────────────────────────────────────────────────────────

class CaseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_advocate(request.user) and not is_admin(request.user):
            return error('Only advocates can view cases.', status.HTTP_403_FORBIDDEN)
        cases = Case.objects.filter(advocate=request.user)
        return success(data=CaseSerializer(cases, many=True).data, message='Cases retrieved.')

    def post(self, request):
        if not is_advocate(request.user):
            return error('Only advocates can create cases.', status.HTTP_403_FORBIDDEN)
        serializer = CaseSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)
        case = serializer.save(advocate=request.user)
        return success(
            data=CaseSerializer(case).data,
            message='Case saved to MongoDB.',
            status_code=status.HTTP_201_CREATED,
        )


class CaseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_case(self, pk, user):
        try:
            return Case.objects.get(id=pk, advocate=user)
        except Case.DoesNotExist:
            return None

    def get(self, request, pk):
        case = self._get_case(pk, request.user)
        if not case:
            return error('Case not found.', status.HTTP_404_NOT_FOUND)
        return success(data=CaseSerializer(case).data, message='Case retrieved.')

    def put(self, request, pk):
        if not is_advocate(request.user):
            return error('Only advocates can update cases.', status.HTTP_403_FORBIDDEN)
        case = self._get_case(pk, request.user)
        if not case:
            return error('Case not found.', status.HTTP_404_NOT_FOUND)
        serializer = CaseSerializer(case, data=request.data, partial=True)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)
        case = serializer.save()
        return success(data=CaseSerializer(case).data, message='Case updated in MongoDB.')

    def delete(self, request, pk):
        if not is_advocate(request.user):
            return error('Only advocates can delete cases.', status.HTTP_403_FORBIDDEN)
        case = self._get_case(pk, request.user)
        if not case:
            return error('Case not found.', status.HTTP_404_NOT_FOUND)
        case.delete()
        return success(message='Case deleted from MongoDB.')


# ─── Email View ───────────────────────────────────────────────────────────────

class EmailSendView(APIView):
    permission_classes = [IsAuthenticated]

    def _build_html(self, email_type, content):
        if email_type == 'advice':
            steps = content.get('steps_to_take', [])
            docs  = content.get('documents_required', [])
            steps_html = ''.join(f'<li style="margin-bottom:6px">{s}</li>' for s in steps) if steps else '<li>See attached PDF for details.</li>'
            docs_html  = ''.join(f'<li>{d}</li>' for d in docs) if docs else ''
            return f"""
            <html><body style="font-family:Arial,sans-serif;padding:24px;color:#1a1a2e;max-width:620px">
            <div style="background:linear-gradient(135deg,#1e3a5f,#4f6ef7);padding:20px 24px;border-radius:10px 10px 0 0">
              <h2 style="color:#fff;margin:0">⚖️ AI Legal Advice</h2>
              <p style="color:#c7d2fe;margin:4px 0 0;font-size:13px">AI Legal Assistant — Powered by Gemini AI</p>
            </div>
            <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:24px">
              <p><strong>Your Query:</strong><br>{content.get('query', '—')}</p>
              {'<p><strong>Constitution Reference:</strong> ' + content.get('constitution_reference','') + '</p>' if content.get('constitution_reference') else ''}
              {'<p><strong>Applicable Law:</strong> ' + content.get('applicable_law','') + '</p>' if content.get('applicable_law') else ''}
              <h3 style="color:#1e3a5f">Steps to Take</h3>
              <ol style="padding-left:20px">{steps_html}</ol>
              {'<h3 style="color:#1e3a5f">Documents Required</h3><ul style="padding-left:20px">' + docs_html + '</ul>' if docs_html else ''}
              {'<p><strong>Where to File:</strong> ' + content.get('where_to_file','') + '</p>' if content.get('where_to_file') else ''}
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
              <p style="font-size:12px;color:#64748b;font-style:italic">{content.get('disclaimer','This is for informational purposes only. Consult a licensed advocate.')}</p>
            </div>
            </body></html>"""

        elif email_type == 'document':
            return f"""
            <html><body style="font-family:Arial,sans-serif;padding:24px;color:#1a1a2e">
            <div style="background:linear-gradient(135deg,#1e3a5f,#4f6ef7);padding:20px 24px;border-radius:10px 10px 0 0">
              <h2 style="color:#fff;margin:0">📄 Generated Legal Document</h2>
            </div>
            <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 10px 10px">
              <pre style="background:#f8f9fa;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px">{content.get('document_text', '')}</pre>
            </div>
            </body></html>"""

        else:
            return f"""
            <html><body style="font-family:Arial,sans-serif;padding:24px">
            <h2 style="color:#1e3a5f">📋 Case Summary</h2>
            <pre style="background:#f5f5f5;padding:15px;border-radius:8px">{json.dumps(content.get('case_details', content), indent=2)}</pre>
            </body></html>"""

    def _build_pdf_text(self, email_type, content):
        """Generate plain-text representation for PDF attachment."""
        if email_type == 'advice':
            lines = [
                "AI LEGAL ADVICE REPORT",
                "=" * 50,
                f"Query: {content.get('query', '')}",
                "",
            ]
            if content.get('constitution_reference'):
                lines.append(f"Constitution Reference: {content['constitution_reference']}")
            if content.get('applicable_law'):
                lines.append(f"Applicable Law: {content['applicable_law']}")
            steps = content.get('steps_to_take', [])
            if steps:
                lines += ["", "STEPS TO TAKE:", "-" * 30]
                for i, s in enumerate(steps, 1):
                    lines.append(f"  {i}. {s}")
            docs = content.get('documents_required', [])
            if docs:
                lines += ["", "DOCUMENTS REQUIRED:", "-" * 30]
                for d in docs:
                    lines.append(f"  • {d}")
            if content.get('where_to_file'):
                lines += ["", f"Where to File: {content['where_to_file']}"]
            if content.get('possible_outcomes'):
                lines += ["", "Possible Outcomes:", "-" * 30]
                for o in content['possible_outcomes']:
                    lines.append(f"  • {o}")
            lines += ["", "-" * 50, content.get('disclaimer', 'This is for informational purposes only. Consult a licensed advocate.')]
            return "\n".join(lines)
        else:
            return content.get('document_text', json.dumps(content, indent=2))

    def post(self, request):
        # Handle multipart form-data where 'content' might be a JSON string
        data = request.data.copy()
        if isinstance(data.get('content'), str):
            try:
                import json
                data['content'] = json.loads(data['content'])
            except (ValueError, TypeError):
                pass

        serializer = EmailSendSerializer(data=data)
        if not serializer.is_valid():
            return error('Validation failed.', status.HTTP_400_BAD_REQUEST, serializer.errors)

        data        = serializer.validated_data
        to_email    = data['to_email']
        email_type  = data['email_type']
        content     = data['content']
        attach_pdf  = data.get('attach_pdf', False)
        document_id = data.get('document_id')
        attachment  = data.get('attachment')

        subject_map = {
            'advice':       'Your AI Legal Advice — AI Legal Assistant',
            'document':     'Your Generated Legal Document — AI Legal Assistant',
            'case_summary': 'Case Summary Report — AI Legal Assistant',
        }
        subject   = subject_map.get(email_type, 'AI Legal Assistant')
        html_body = self._build_html(email_type, content)

        # ── Build PDF attachment if requested ─────────────────────────────────
        pdf_buffer = None
        pdf_filename = 'legal_advice.pdf'

        if attach_pdf:
            try:
                if document_id:
                    # Attach existing document PDF
                    doc = Document.objects.filter(id=document_id, user=request.user).first()
                    if doc:
                        pdf_buffer   = create_pdf_buffer(doc.generated_text)
                        pdf_filename = f"{doc.document_type}.pdf"
                else:
                    # Generate a fresh PDF from the advice content
                    pdf_text     = self._build_pdf_text(email_type, content)
                    pdf_buffer   = create_pdf_buffer(pdf_text)
                    pdf_filename = f"legal_{email_type}.pdf"
            except Exception:
                pass  # If PDF generation fails, still send the HTML email

        # ── Log ───────────────────────────────────────────────────────────────
        email_log = EmailLog.objects.create(
            user=request.user,
            to_email=to_email,
            subject=subject,
            email_type=email_type,
            status='pending',
        )

        # ── Send ──────────────────────────────────────────────────────────────
        from email.mime.base import MIMEBase
        from email import encoders

        sent = False
        for attempt in range(3):
            try:
                # Use 'mixed' so we can attach binary files
                msg = MIMEMultipart('mixed')
                msg['Subject'] = subject
                msg['From']    = f"{request.user.full_name} <{settings.EMAIL_HOST_USER}>"
                msg['To']      = to_email
                msg['Reply-To'] = request.user.email

                # HTML body wrapped in a 'related' part
                alt = MIMEMultipart('alternative')
                alt.attach(MIMEText(html_body, 'html'))
                msg.attach(alt)

                # PDF attachment
                if pdf_buffer:
                    pdf_buffer.seek(0)
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(pdf_buffer.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename="{pdf_filename}"')
                    msg.attach(part)

                # Custom user attachment
                if attachment:
                    attachment.seek(0)
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f'attachment; filename="{attachment.name}"')
                    msg.attach(part)

                with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                    server.starttls()
                    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                    server.sendmail(settings.EMAIL_HOST_USER, to_email, msg.as_string())
                sent = True
                break
            except Exception:
                if attempt < 2:
                    time.sleep(1)

        email_log.status = 'sent' if sent else 'failed'
        email_log.save()

        if sent:
            msg_text = 'Email sent with PDF attachment.' if pdf_buffer else 'Email sent successfully.'
            return success(message=msg_text)
        return error('Failed to send email after 3 attempts.', status.HTTP_500_INTERNAL_SERVER_ERROR)



# ─── Admin Views ──────────────────────────────────────────────────────────────

class AdminUsersView(APIView):
    from .permissions import IsAdminUserRole
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        role_filter = request.query_params.get('role')
        page = int(request.query_params.get('page', 1))
        page_size = 20

        qs = User.objects.all()
        if role_filter:
            qs = qs.filter(role=role_filter)

        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        users = qs[start:end]

        return success(
            data={
                'results': AdminUserSerializer(users, many=True).data,
                'total': total,
                'page': page,
                'pages': (total + page_size - 1) // page_size,
            },
            message='Users retrieved.',
        )


class AdminUserVerifyView(APIView):
    from .permissions import IsAdminUserRole
    permission_classes = [IsAdminUserRole]

    def patch(self, request, pk):
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return error('User not found.', status.HTTP_404_NOT_FOUND)
        user.is_verified = True
        user.save()
        return success(data=AdminUserSerializer(user).data, message='User verified.')


class AdminUserDeleteView(APIView):
    from .permissions import IsAdminUserRole
    permission_classes = [IsAdminUserRole]

    def delete(self, request, pk):
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return error('User not found.', status.HTTP_404_NOT_FOUND)
        user.delete()
        return success(message='User deleted.')


class AdminStatsView(APIView):
    from .permissions import IsAdminUserRole
    permission_classes = [IsAdminUserRole]

    def get(self, request):
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        stats = {
            'total_users': User.objects.filter(role__in=['user', 'citizen']).count(),
            'total_advocates': User.objects.filter(role__in=['advocate', 'lawyer']).count(),
            'pending_verifications': User.objects.filter(role__in=['advocate', 'lawyer'], is_verified=False).count(),
            'ai_queries_today': AdviceHistory.objects.filter(created_at__gte=today_start).count(),
            'total_cases': Case.objects.count(),
            'documents_generated': Document.objects.count(),
        }
        return success(data=stats, message='Stats retrieved.')


def registerPage(req):
    # Signup 
    if req.method == 'POST':
        name = req.POST.get("username")
        pwd = req.POST.get("password")
        email = req.POST.get("email")
        if name and pwd and email:
            user_data = {
                "username": name,
                "password": pwd,
                "email": email
            }
            collection.create_index("username", unique=True)
            collection.insert_one(user_data)


def loginPage(req):
    message = ""
    if req.method == "POST":
        name = req.POST.get("username")
        pwd = req.POST.get("password")

        if not name:
            message = "Please provide a username."
        else:
            user = collection.find_one({"username": name})
            print(user)
            if user:
                if pwd != '':
                    if user.get("password") == pwd:
                        message = "User successfully signed in / logged in."
                        return redirect('/')
                    else:
                        message = "Password incorrect for this user."
                else:
                    message = "Please Enter Password."
            else:
                message = "This username does not exist."

    context = {"message": message}
    return render(req, 'login.html', context=context)


# ─── Indian Kanoon (IKAPI) Views ──────────────────────────────────────────────
from .ikapi_service import get_ik_service


class IKSearchView(APIView):
    """
    GET /api/v1/ik/search/

    Query params:
      q        – search query (required)
      page     – page number (0-indexed, default 0)
      fromdate – DD-MM-YYYY
      todate   – DD-MM-YYYY
      sortby   – mostrecent | leastrecent
      doctype  – filter by document type

    Returns list of matching cases from Indian Kanoon.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return error('Query parameter "q" is required.', status.HTTP_400_BAD_REQUEST)

        try:
            page     = int(request.query_params.get('page', 0))
            maxpages = int(request.query_params.get('maxpages', 1))
        except ValueError:
            page, maxpages = 0, 1

        svc = get_ik_service(
            maxpages = min(maxpages, 5),
            sortby   = request.query_params.get('sortby', ''),
            fromdate = request.query_params.get('fromdate', ''),
            todate   = request.query_params.get('todate', ''),
        )
        if svc is None:
            return error(
                'Indian Kanoon API token is not configured. Add INDIANKANOON_API_TOKEN to your .env file.',
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        result = svc.search_query(q, pagenum=page, maxpages=min(maxpages, 5))

        if 'error' in result:
            return error(result['error'], status.HTTP_502_BAD_GATEWAY)

        return success(data=result, message=f'Found {result.get("found", 0)} results.')


class IKDocView(APIView):
    """
    GET /api/v1/ik/doc/<docid>/

    Fetch full judgment text and metadata for an Indian Kanoon document.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, docid):
        svc = get_ik_service()
        if svc is None:
            return error(
                'Indian Kanoon API token is not configured.',
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        maxcites   = int(request.query_params.get('maxcites', 5))
        maxcitedby = int(request.query_params.get('maxcitedby', 5))

        result = svc.get_document(docid, maxcites=maxcites, maxcitedby=maxcitedby)

        if 'error' in result:
            return error(result['error'], status.HTTP_502_BAD_GATEWAY)

        return success(data=result, message='Document retrieved from Indian Kanoon.')


class IKCitationsView(APIView):
    """
    GET /api/v1/ik/doc/<docid>/citations/

    Cases that this document cites (outgoing references).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, docid):
        svc = get_ik_service()
        if svc is None:
            return error(
                'Indian Kanoon API token is not configured.',
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        result = svc.get_citations(docid)

        if 'error' in result:
            return error(result['error'], status.HTTP_502_BAD_GATEWAY)

        return success(
            data=result,
            message=f'Found {result.get("found", 0)} cases cited by document {docid}.',
        )


class IKCitedByView(APIView):
    """
    GET /api/v1/ik/doc/<docid>/citedby/

    Cases that cite this document (incoming references / later judgments).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, docid):
        svc = get_ik_service()
        if svc is None:
            return error(
                'Indian Kanoon API token is not configured.',
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        result = svc.get_cited_by(docid)

        if 'error' in result:
            return error(result['error'], status.HTTP_502_BAD_GATEWAY)

        return success(
            data=result,
            message=f'Found {result.get("found", 0)} cases citing document {docid}.',
        )


# ─── Constitution Search View ─────────────────────────────────────────────────

class ConstitutionSearchView(APIView):
    """
    GET /api/v1/constitution/search/

    Query params:
      q      – search keyword(s), article number, or topic (optional)
      filter – Part/tag filter, e.g. 'Fundamental Rights', 'DPSP', 'Emergency Provisions'
      page   – page number (default 1)
      limit  – results per page (default 20, max 50)

    Returns matching ConstitutionArticle records from the database.
    Also used by Gemini AI as context for legal advice queries.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Q

        q           = request.query_params.get('q', '').strip()
        tag_filter  = request.query_params.get('filter', '').strip()
        page        = max(1, int(request.query_params.get('page', 1)))
        limit       = min(50, max(1, int(request.query_params.get('limit', 20))))

        qs = ConstitutionArticle.objects.all()

        # Apply tag/part filter
        if tag_filter and tag_filter.lower() != 'all':
            qs = qs.filter(tags__icontains=tag_filter)

        # Apply keyword search
        if q:
            qs = qs.filter(
                Q(article_number__icontains=q) |
                Q(title__icontains=q) |
                Q(short_description__icontains=q) |
                Q(full_text__icontains=q) |
                Q(part__icontains=q)
            )

        total  = qs.count()
        start  = (page - 1) * limit
        items  = qs[start:start + limit]

        results = [
            {
                'id':                a.id,
                'article_number':    a.article_number,
                'title':             a.title,
                'part':              a.part,
                'part_number':       a.part_number,
                'tags':              a.tags,
                'short_description': a.short_description,
                'full_text':         a.full_text,
            }
            for a in items
        ]

        return success(
            data={
                'results': results,
                'total':   total,
                'page':    page,
                'pages':   (total + limit - 1) // limit if total else 1,
                'has_next': start + limit < total,
            },
            message=f'Found {total} article(s) matching your query.'
        )


# ─── Announcements ────────────────────────────────────────────────────────────

class AnnouncementListView(APIView):
    """
    GET /api/v1/announcements/
    Returns latest 20 announcements for any logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        announcements = Announcement.objects.all()[:20]
        return success(
            data=AnnouncementSerializer(announcements, many=True).data,
            message='Announcements retrieved.'
        )


class AdminAnnouncementView(APIView):
    """
    POST   /api/v1/admin/announcements/      – create new announcement (admin only)
    DELETE /api/v1/admin/announcements/<pk>/ – delete announcement (admin only)
    """
    permission_classes = [IsAuthenticated]

    def _check_admin(self, user):
        if not is_admin(user):
            return error('Admin access required.', 403)
        return None

    def post(self, request):
        guard = self._check_admin(request.user)
        if guard:
            return guard
        serializer = AnnouncementSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', 400, serializer.errors)
        serializer.save()
        return success(data=serializer.data, message='Announcement created.', status_code=201)

    def delete(self, request, pk=None):
        guard = self._check_admin(request.user)
        if guard:
            return guard
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return error('Announcement not found.', 404)
        ann.delete()
        return success(message='Announcement deleted.')


# ─── Nyaya Voice Assistant Views ──────────────────────────────────────────────

import google.generativeai as _genai
_genai.configure(api_key=os.environ.get('GEMINI_API_KEY', ''))


class NyayaDraftView(APIView):
    """
    POST /api/v1/nyaya/draft/
    Accepts user's legal situation context and uses Gemini AI to compose
    a professional email body on the user's behalf.
    Returns: { subject, body, suggested_actions }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NyayaDraftSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', 400, serializer.errors)

        d = serializer.validated_data
        user = request.user
        user_name = d.get('user_name') or getattr(user, 'full_name', user.email)
        user_email = d.get('user_email') or user.email
        lawyer_name = d.get('lawyer_name') or 'Respected Advocate'
        situation = d['case_situation']
        urgency = d.get('urgency', 'Normal')
        specific_ask = d.get('specific_ask', '')

        # --- Subject line ---
        subject = f"Legal {d.get('urgency','Normal')} Enquiry — {user_name}"

        # --- Gemini AI body draft ---
        prompt = (
            "You are Nyaya, a professional legal communication assistant for Dharma Vault AI Legal Assistant, "
            "an Indian legal advisory platform. "
            "Draft a clear, professional, respectful email body (no subject line, no greeting salutation) "
            "on behalf of a citizen to a lawyer or authority. "
            "Use simple, formal English. Do NOT invent facts, case numbers, or legal claims not stated. "
            "Always end with: 'I look forward to your guidance. Please let me know a convenient time to discuss this matter further.' "
            "Do not add any information that is not in the provided details.\n\n"
            f"SENDER: {user_name} ({user_email})\n"
            f"RECIPIENT: {lawyer_name} ({d['to_email']})\n"
            f"URGENCY: {urgency}\n"
            f"SITUATION: {situation}\n"
            f"SPECIFIC ASK: {specific_ask}\n\n"
            "Write only the email body paragraphs. No subject line, no greeting, no sign-off."
        )

        body = ''
        try:
            model = _genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content(prompt)
            body = response.text.strip()
        except Exception as e:
            print(f'[NyayaDraft] Gemini failed: {e}')
            body = (
                f"I am writing to seek your legal guidance regarding the following matter:\n\n"
                f"{situation}\n\n"
                f"{specific_ask}\n\n"
                "I look forward to your guidance. Please let me know a convenient time to discuss this matter further."
            )

        # --- AI next-step suggestions ---
        suggestions = []
        try:
            sug_prompt = (
                "Based on this legal situation described by an Indian citizen, "
                "suggest exactly 3 concise, actionable next steps they can take. "
                "Format: Return only a JSON array of 3 short strings, each max 15 words. "
                "No numbering, no markdown, just the JSON array.\n\n"
                f"Situation: {situation}"
            )
            sug_response = model.generate_content(sug_prompt)
            raw = sug_response.text.strip()
            # Strip markdown code block if present
            if raw.startswith('```'):
                raw = raw.split('```')[1]
                if raw.startswith('json'):
                    raw = raw[4:]
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                suggestions = []
        except Exception as e:
            print(f'[NyayaDraft] Suggestions failed: {e}')
            suggestions = [
                'Consult a licensed advocate to evaluate your case.',
                'Gather all relevant documents and evidence before proceeding.',
                'Consider sending a formal legal notice via registered post.',
            ]

        return success(data={
            'subject': subject,
            'body': body,
            'suggested_actions': suggestions,
            'user_name': user_name,
            'user_email': user_email,
            'lawyer_name': lawyer_name,
            'to_email': d['to_email'],
            'urgency': urgency,
        }, message='Email draft generated.')


class NyayaSendView(APIView):
    """
    POST /api/v1/nyaya/send/
    Sends the email ONLY if confirmed=True (Step 5 guardrail).
    Logs the result in NyayaEmailLog.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]

    def post(self, request):
        serializer = NyayaSendSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Validation failed.', 400, serializer.errors)

        d = serializer.validated_data
        user = request.user
        attachments = request.FILES.getlist('files')
        attachment_names = [f.name for f in attachments]
        attachment_names += d.get('attachments_json', [])

        # Build context for email_service
        context = {
            'user_name': getattr(user, 'full_name', user.email),
            'user_full_name': getattr(user, 'full_name', user.email),
            'user_email': user.email,
            'lawyer_name': d.get('lawyer_name', 'Advocate'),
            'to_email': d['to_email'],
            'subject': d['subject'],
            'email_body': d['body'],
            'ai_drafted_body': d['body'],
            'attachments_list': attachment_names,
            'case_situation': d.get('case_situation', ''),
            'urgency': d.get('urgency', 'Normal'),
            'specific_ask': d.get('specific_ask', ''),
        }

        # Read actual file contents for email attachment
        extra_attachments = []
        for f in attachments:
            extra_attachments.append({
                'filename': f.name,
                'content': f.read()
            })

        from .email_service import send_legal_email
        result = send_legal_email(
            user=user,
            to_email=d['to_email'],
            email_type='lawyer_communication',
            context=context,
            attach_pdf=False,
            extra_attachments=extra_attachments,
        )

        status_val = 'sent' if result['success'] else 'failed'
        log = NyayaEmailLog.objects.create(
            user=user,
            to_email=d['to_email'],
            lawyer_name=d.get('lawyer_name', ''),
            subject=d['subject'],
            body=d['body'],
            case_situation=d.get('case_situation', ''),
            urgency=d.get('urgency', 'Normal'),
            specific_ask=d.get('specific_ask', ''),
            attachments_json=attachment_names,
            suggested_actions=[],
            status=status_val,
        )

        if result['success']:
            return success(
                data={'log_id': log.id, 'to_email': d['to_email']},
                message=f"Your email has been sent to {d['to_email']}",
            )
        return error(
            f"Failed to send email: {result.get('error', 'Unknown error')}",
            status_code=502,
        )


class NyayaSuggestView(APIView):
    """
    POST /api/v1/nyaya/suggest/
    Returns 2-3 AI-generated next-step suggestions for the user's legal situation.
    Used in Step 6 of the Nyaya workflow.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        situation = request.data.get('case_situation', '').strip()
        if not situation or len(situation) < 10:
            return error('Please describe your situation in at least 10 characters.', 400)

        suggestions = []
        try:
            model = _genai.GenerativeModel('gemini-2.0-flash')
            prompt = (
                "Based on this legal situation described by an Indian citizen, "
                "suggest exactly 3 concise, actionable next steps they can take. "
                "Format: Return only a JSON array of 3 short strings, each max 20 words. "
                "No numbering, no markdown, just the raw JSON array.\n\n"
                f"Situation: {situation}"
            )
            response = model.generate_content(prompt)
            raw = response.text.strip()
            if raw.startswith('```'):
                raw = raw.split('```')[1]
                if raw.startswith('json'):
                    raw = raw[4:]
            suggestions = json.loads(raw)
            if not isinstance(suggestions, list):
                raise ValueError('Not a list')
        except Exception as e:
            print(f'[NyayaSuggest] Gemini failed: {e}')
            suggestions = [
                'Consult a licensed advocate to evaluate your case.',
                'Gather all relevant documents and evidence before proceeding.',
                'Consider sending a formal legal notice via registered post.',
            ]

        return success(data={'suggestions': suggestions[:3]}, message='Suggestions generated.')


class NyayaHistoryView(APIView):
    """
    GET /api/v1/nyaya/history/
    Returns the logged-in user's Nyaya email history for in-app display (Step 8).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = NyayaEmailLog.objects.filter(user=request.user)[:20]
        serializer = NyayaEmailLogSerializer(logs, many=True)
        return success(data=serializer.data, message='Nyaya email history retrieved.')


# ─── YouTube Search View ──────────────────────────────────────────────────────

class YouTubeSearchView(APIView):
    """
    GET /api/v1/youtube/search/?q=<query>&max=<int>&lang=<code>

    Searches YouTube for legal explainer videos matching the query.
    Uses the YouTube Data API v3 (api-samples-master/python/search.py pattern).

    Query Params:
        q    (required) - search term, e.g. "IPC Section 420 cheating"
        max  (optional) - max results, default 4, max 8
        lang (optional) - BCP-47 language code: 'hi' (Hindi) or 'en' (English)

    Returns:
        { success: true, data: { videos: [...], query: str } }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .youtube_service import search_youtube_legal_videos

        query = request.query_params.get('q', '').strip()
        if not query:
            return error('Query parameter "q" is required.', status.HTTP_400_BAD_REQUEST)

        try:
            max_results = min(int(request.query_params.get('max', 4)), 8)
        except (ValueError, TypeError):
            max_results = 4

        language = request.query_params.get('lang', None)

        videos = search_youtube_legal_videos(query, max_results=max_results, language=language)

        return success(
            data={'videos': videos, 'query': query},
            message=f'{len(videos)} video(s) found for "{query}".',
        )


# ─── RBAC Role Views ──────────────────────────────────────────────────────────

class RoleMatrixView(APIView):
    """
    GET /api/auth/roles/
    Returns system RBAC permission matrix and available roles.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .permissions import ROLE_PERMISSION_MATRIX
        roles = [
            {'code': 'super_admin', 'name': 'Super Admin', 'description': 'Full system control & security configuration'},
            {'code': 'admin', 'name': 'Admin', 'description': 'Manage users, lawyers, cases, and analytics'},
            {'code': 'lawyer', 'name': 'Lawyer (Advocate)', 'description': 'Manage assigned cases & legal client services'},
            {'code': 'citizen', 'name': 'Citizen (User)', 'description': 'Legal advice queries, case tracking, booking'},
        ]
        return success(data={
            'roles': roles,
            'matrix': ROLE_PERMISSION_MATRIX,
        }, message='RBAC Role Matrix retrieved.')


class RoleAssignView(APIView):
    """
    POST /api/auth/assign-role/
    Updates user role (Admin/Super Admin access required).
    """
    from .permissions import IsAdminUserRole
    permission_classes = [IsAdminUserRole]

    def post(self, request):
        from .serializers import RoleAssignSerializer
        serializer = RoleAssignSerializer(data=request.data)
        if not serializer.is_valid():
            return error('Invalid payload.', status.HTTP_400_BAD_REQUEST, serializer.errors)

        user_id = serializer.validated_data['user_id']
        new_role = serializer.validated_data['role']

        if new_role == 'super_admin' and not request.user.is_super_admin:
            return error('Only Super Admins can assign the super_admin role.', status.HTTP_403_FORBIDDEN)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return error('User not found.', status.HTTP_404_NOT_FOUND)

        target_user.role = new_role
        target_user.save()

        return success(
            data={'user': UserSerializer(target_user).data},
            message=f"Role for {target_user.email} updated to {new_role}."
        )


