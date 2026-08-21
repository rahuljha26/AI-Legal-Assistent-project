from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, AdviceHistory, Document, Case, EmailLog, Announcement, NyayaEmailLog


# ─── Auth Serializers ─────────────────────────────────────────────────────────

class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, min_length=8,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('full_name', 'email', 'password', 'confirm_password', 'role')

    def validate_role(self, value):
        valid_roles = ('user', 'citizen', 'advocate', 'lawyer', 'admin', 'super_admin')
        if value not in valid_roles:
            raise serializers.ValidationError("Invalid role selected.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        if validated_data.get('role') in ('user', 'citizen'):
            user.is_verified = True
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, style={'input_type': 'password'})


class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    role_code = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'role', 'role_code', 'is_verified', 'profile_picture', 'permissions', 'created_at')
        read_only_fields = ('id', 'full_name', 'email', 'role', 'role_code', 'is_verified', 'profile_picture', 'permissions', 'created_at')

    def get_permissions(self, obj):
        from .permissions import get_user_permissions
        return get_user_permissions(obj)

    def get_role_code(self, obj):
        return obj.get_role_code()


class RoleAssignSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    role = serializers.ChoiceField(choices=['super_admin', 'admin', 'lawyer', 'advocate', 'citizen', 'user'], required=True)



class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_new_password']:
            raise serializers.ValidationError({"confirm_new_password": "Passwords do not match."})
        return attrs


# ─── Advice Serializers ───────────────────────────────────────────────────────

class AdviceAskSerializer(serializers.Serializer):
    query = serializers.CharField(min_length=5, max_length=2000)
    file = serializers.FileField(required=False)


class AdviceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AdviceHistory
        fields = ('id', 'query', 'constitution_reference', 'ai_response', 'created_at')


# ─── Document Serializers ─────────────────────────────────────────────────────

class DocumentGenerateSerializer(serializers.Serializer):
    DOCUMENT_TYPE_CHOICES = (
        ('legal_notice', 'Legal Notice'),
        ('affidavit', 'Affidavit'),
        ('complaint_letter', 'Complaint Letter'),
        ('rent_agreement', 'Rent Agreement'),
    )
    document_type = serializers.ChoiceField(choices=DOCUMENT_TYPE_CHOICES)
    details = serializers.DictField()


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ('id', 'document_type', 'input_data', 'generated_text', 'pdf_path', 'created_at')


# ─── Case Serializers ─────────────────────────────────────────────────────────

class CaseSerializer(serializers.ModelSerializer):
    STATUS_CHOICES = ('active', 'closed', 'pending', 'adjourned')

    class Meta:
        model = Case
        fields = ('id', 'client_name', 'case_type', 'description', 'status',
                  'hearing_date', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_status(self, value):
        valid = ('active', 'closed', 'pending', 'adjourned')
        if value not in valid:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid)}")
        return value


# ─── Email Serializers ────────────────────────────────────────────────────────

class EmailSendSerializer(serializers.Serializer):
    EMAIL_TYPE_CHOICES = (
        ('advice', 'Advice'),
        ('document', 'Document'),
        ('case_summary', 'Case Summary'),
    )
    to_email = serializers.EmailField(required=True)
    email_type = serializers.ChoiceField(choices=EMAIL_TYPE_CHOICES, required=True)
    content = serializers.DictField(required=True)
    attach_pdf = serializers.BooleanField(default=False)
    document_id = serializers.IntegerField(required=False, allow_null=True)
    attachment = serializers.FileField(required=False, allow_null=True)


# ─── Admin Serializers ────────────────────────────────────────────────────────

class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'full_name', 'email', 'role', 'is_verified', 'is_active', 'profile_picture', 'created_at')


class AnnouncementSerializer(serializers.ModelSerializer):
    tag_display = serializers.CharField(source='get_tag_display', read_only=True)

    class Meta:
        model = Announcement
        fields = ('id', 'title', 'content', 'tag', 'tag_display', 'created_at')


# ─── Nyaya Voice Assistant Serializers ───────────────────────────────────────

class NyayaDraftSerializer(serializers.Serializer):
    """Validates the request to draft an email via the Nyaya Voice Assistant."""
    URGENCY_CHOICES = ['Low', 'Normal', 'High', 'Urgent']

    to_email = serializers.EmailField(required=True)
    lawyer_name = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    case_situation = serializers.CharField(min_length=10, max_length=3000)
    urgency = serializers.ChoiceField(choices=URGENCY_CHOICES, default='Normal')
    specific_ask = serializers.CharField(max_length=1000, required=False, default='', allow_blank=True)
    user_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    user_email = serializers.EmailField(required=False, allow_blank=True)


class NyayaSendSerializer(serializers.Serializer):
    """Validates the final send request — requires explicit user confirmation."""
    to_email = serializers.EmailField(required=True)
    lawyer_name = serializers.CharField(max_length=255, required=False, default='', allow_blank=True)
    subject = serializers.CharField(max_length=500)
    body = serializers.CharField()
    case_situation = serializers.CharField(required=False, default='', allow_blank=True)
    urgency = serializers.CharField(required=False, default='Normal')
    specific_ask = serializers.CharField(required=False, default='', allow_blank=True)
    attachments_json = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    # CRITICAL: send is blocked unless confirmed=True — enforces Step 5 of the workflow
    confirmed = serializers.BooleanField()

    def validate_confirmed(self, value):
        if not value:
            raise serializers.ValidationError(
                "Email cannot be sent without explicit user confirmation (confirmed must be true)."
            )
        return value


class NyayaEmailLogSerializer(serializers.ModelSerializer):
    """Serializes stored Nyaya email history for display in-app."""
    class Meta:
        model = NyayaEmailLog
        fields = (
            'id', 'to_email', 'lawyer_name', 'subject', 'body',
            'case_situation', 'urgency', 'attachments_json',
            'suggested_actions', 'status', 'created_at',
        )
