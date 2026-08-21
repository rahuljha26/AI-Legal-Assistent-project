from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from .models import User
from .security.email_verification import verify_email_token, send_verification_email
from .security.two_factor import create_email_otp, send_otp_email, verify_otp, setup_totp, verify_totp, enable_2fa, disable_2fa
from .security.models import UserSession, LoginHistory, AuditLog
from .security.session_manager import get_active_sessions, revoke_session, revoke_all_sessions
from .serializers import UserSerializer

class VerifyEmailView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"success": False, "message": "Token is required"}, status=400)
        user, msg = verify_email_token(token, request)
        if not user:
            return Response({"success": False, "message": msg}, status=400)
        return Response({"success": True, "message": msg})

class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"success": False, "message": "Email required"}, status=400)
        try:
            user = User.objects.get(email__iexact=email)
            if user.is_verified:
                return Response({"success": False, "message": "Already verified"}, status=400)
            send_verification_email(user, request)
            return Response({"success": True, "message": "Verification email sent"})
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found"}, status=404)

class SendOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"success": False, "message": "Email required"}, status=400)
        try:
            user = User.objects.get(email__iexact=email)
            otp, code = create_email_otp(user)
            send_otp_email(user, code)
            return Response({"success": True, "message": "OTP sent to email"})
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found"}, status=404)

class VerifyOTPView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        if not email or not code:
            return Response({"success": False, "message": "Email and code required"}, status=400)
        try:
            user = User.objects.get(email__iexact=email)
            is_valid = False
            msg = "Invalid verification code"

            if user.two_factor_enabled and user.two_factor_method == 'totp':
                is_valid = verify_totp(user, code)
                msg = "Google Authenticator code verified" if is_valid else "Invalid Google Authenticator code. Please try again."
            else:
                is_valid, msg = verify_otp(user, code)

            if not is_valid:
                return Response({"success": False, "message": msg}, status=400)

            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            return Response({
                "success": True,
                "data": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": UserSerializer(user).data
                },
                "message": "Login successful"
            })
        except User.DoesNotExist:
            return Response({"success": False, "message": "User not found"}, status=404)

class SessionListView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        sessions = get_active_sessions(request.user)
        data = [{
            "id": s.id,
            "ip_address": s.ip_address,
            "device_type": s.device_type,
            "browser": s.browser,
            "os": s.os,
            "login_at": s.login_at,
            "last_activity": s.last_activity
        } for s in sessions]
        return Response({"success": True, "data": data})

class SessionDeleteView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request, pk):
        revoke_session(request.user, pk)
        return Response({"success": True, "message": "Session terminated"})

class LogoutAllView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request):
        revoke_all_sessions(request.user)
        return Response({"success": True, "message": "All sessions terminated"})

class LoginHistoryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        history = LoginHistory.objects.filter(user=request.user).order_by('-created_at')[:20]
        data = [{
            "ip_address": h.ip_address,
            "device_type": h.device_type,
            "browser": h.browser,
            "os": h.os,
            "status": h.status,
            "login_method": h.login_method,
            "created_at": h.created_at
        } for h in history]
        return Response({"success": True, "data": data})

class AuditLogView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        if request.user.role not in ["admin", "super_admin"]:
            return Response({"success": False, "message": "Access denied"}, status=403)
        logs = AuditLog.objects.all().order_by('-created_at')[:50]
        data = [{
            "action": l.action,
            "user_email": l.user.email if l.user else "Unknown",
            "ip_address": l.ip_address,
            "created_at": l.created_at
        } for l in logs]
        return Response({"success": True, "data": data})

class Manage2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "success": True,
            "data": {
                "two_factor_enabled": request.user.two_factor_enabled,
                "two_factor_method": request.user.two_factor_method,
            }
        })

    def post(self, request):
        action = request.data.get("action")
        if action == "status":
            return Response({
                "success": True,
                "data": {
                    "two_factor_enabled": request.user.two_factor_enabled,
                    "two_factor_method": request.user.two_factor_method,
                }
            })
        elif action == "enable":
            setup = setup_totp(request.user)
            return Response({"success": True, "data": setup})
        elif action == "verify_enable":
            code = request.data.get("code")
            if not code:
                return Response({"success": False, "message": "Verification code is required"}, status=400)
            if verify_totp(request.user, code):
                enable_2fa(request.user, "totp")
                return Response({"success": True, "message": "Google Authenticator 2FA enabled successfully"})
            return Response({"success": False, "message": "Invalid Google Authenticator code. Please check your app."}, status=400)
        elif action == "disable":
            disable_2fa(request.user)
            return Response({"success": True, "message": "Google Authenticator 2FA disabled successfully"})
        return Response({"success": False, "message": "Invalid action"}, status=400)
