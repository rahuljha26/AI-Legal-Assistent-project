from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super_admin')
        extra_fields.setdefault('is_verified', True)
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('super_admin', 'Super Admin'),
        ('admin', 'Admin'),
        ('lawyer', 'Lawyer'),
        ('advocate', 'Advocate'),
        ('citizen', 'Citizen'),
        ('user', 'User'),
    )

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='citizen')
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    profile_picture = models.URLField(max_length=500, blank=True, null=True)
    # OAuth Fields
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    auth_provider = models.CharField(max_length=50, default='email')
    # Security Fields
    email_verified_at = models.DateTimeField(null=True, blank=True)
    two_factor_enabled = models.BooleanField(default=False)
    two_factor_method = models.CharField(max_length=10, blank=True, default='')
    totp_secret = models.CharField(max_length=32, blank=True, default='')
    backup_codes = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    @property
    def first_name(self):
        return self.full_name.split()[0] if self.full_name else ''

    @property
    def last_name(self):
        parts = self.full_name.split() if self.full_name else []
        return ' '.join(parts[1:]) if len(parts) > 1 else ''

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email

    def get_role_code(self):
        role_str = (self.role or 'citizen').lower()
        if role_str == 'advocate':
            return 'lawyer'
        if role_str == 'user':
            return 'citizen'
        return role_str

    @property
    def is_super_admin(self):
        return self.get_role_code() == 'super_admin' or self.is_superuser

    @property
    def is_admin_user(self):
        return self.get_role_code() in ['admin', 'super_admin'] or self.is_staff or self.is_superuser

    @property
    def is_lawyer_user(self):
        return self.get_role_code() in ['lawyer', 'advocate', 'admin', 'super_admin']

    @property
    def is_citizen_user(self):
        return True


from .security.models import Role, Permission, RolePermission, UserRole



class AdviceHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='advice_history')
    query = models.TextField()
    constitution_reference = models.JSONField(null=True, blank=True)
    ai_response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'advice_history'
        ordering = ['-created_at']

    def __str__(self):
        return f"Query by {self.user.email} on {self.created_at}"


class Document(models.Model):
    DOCUMENT_TYPE_CHOICES = (
        ('legal_notice', 'Legal Notice'),
        ('affidavit', 'Affidavit'),
        ('complaint_letter', 'Complaint Letter'),
        ('rent_agreement', 'Rent Agreement'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPE_CHOICES)
    input_data = models.JSONField()
    generated_text = models.TextField()
    pdf_path = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.document_type} for {self.user.email}"


class Case(models.Model):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('pending', 'Pending'),
        ('adjourned', 'Adjourned'),
    )

    advocate = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cases')
    client_name = models.CharField(max_length=255)
    case_type = models.CharField(max_length=100)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    hearing_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cases'
        ordering = ['-created_at']

    def __str__(self):
        return f"Case: {self.case_type} for {self.client_name}"


class EmailLog(models.Model):
    EMAIL_TYPE_CHOICES = (
        ('advice', 'Advice'),
        ('document', 'Document'),
        ('case_summary', 'Case Summary'),
    )
    STATUS_CHOICES = (
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('pending', 'Pending'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='email_logs', null=True, blank=True)
    to_email = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    email_type = models.CharField(max_length=20, choices=EMAIL_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Email ({self.email_type}) to {self.to_email} - {self.status}"


class ConstitutionArticle(models.Model):
    """
    Stores all articles of the Constitution of India.
    Used by Gemini AI as context for legal queries and by ConstitutionPage for search.
    """
    article_number = models.CharField(max_length=30, unique=True, db_index=True)
    title = models.CharField(max_length=500)
    part = models.CharField(max_length=200)
    part_number = models.CharField(max_length=10)
    tags = models.JSONField(default=list)          # e.g. ["Fundamental Rights", "Part III"]
    short_description = models.TextField()
    full_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'constitution_articles'
        ordering = ['id']

    def __str__(self):
        return f"{self.article_number} — {self.title}"


class Announcement(models.Model):
    TAG_CHOICES = (
        ('feature', 'New Feature'),
        ('update', 'System Update'),
        ('fix', 'Bug Fix'),
    )

    title = models.CharField(max_length=255)
    content = models.TextField()
    tag = models.CharField(max_length=20, choices=TAG_CHOICES, default='feature')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcements'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class NyayaEmailLog(models.Model):
    """
    Stores all emails composed and sent via the Nyaya Voice Assistant.
    Separate from generic EmailLog to track Nyaya-specific fields like
    lawyer info, case situation, urgency, and AI-suggested next actions.
    """
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='nyaya_email_logs', null=True, blank=True
    )
    to_email = models.EmailField()
    lawyer_name = models.CharField(max_length=255, blank=True, default='')
    subject = models.CharField(max_length=500)
    body = models.TextField()
    case_situation = models.TextField(blank=True, default='')
    urgency = models.CharField(max_length=50, blank=True, default='Normal')
    specific_ask = models.TextField(blank=True, default='')
    attachments_json = models.JSONField(default=list)     # list of attachment filenames (in-transit only)
    suggested_actions = models.JSONField(default=list)    # AI-generated next-step suggestions
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nyaya_email_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Nyaya email to {self.to_email} — {self.status} ({self.created_at:%Y-%m-%d})"


class BareActAmendment(models.Model):
    """
    Stores 2023 Bare Act Amendment notifications and statutory revisions.
    Used by Gemini AI context builder and Amendment Search API.
    """
    act_number = models.CharField(max_length=50, unique=True, db_index=True)
    act_name = models.CharField(max_length=500)
    year = models.IntegerField(db_index=True)
    assent_date = models.DateField(null=True, blank=True)
    publication_date = models.DateField(null=True, blank=True)
    principal_act = models.CharField(max_length=500)
    sections_affected = models.CharField(max_length=500)
    tags = models.JSONField(default=list)
    summary = models.TextField()
    full_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bare_act_amendments'
        ordering = ['-year', 'act_number']

    def __str__(self):
        return f"{self.act_name} ({self.act_number})"

