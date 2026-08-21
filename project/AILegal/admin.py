from django.contrib import admin
from .models import User, AdviceHistory, Document, Case, EmailLog, Announcement


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'full_name', 'role', 'is_verified', 'is_active', 'created_at')
    list_filter = ('role', 'is_verified', 'is_active')
    search_fields = ('email', 'full_name')
    ordering = ('-created_at',)


@admin.register(AdviceHistory)
class AdviceHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'query', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'query')
    ordering = ('-created_at',)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('user', 'document_type', 'created_at')
    list_filter = ('document_type',)
    search_fields = ('user__email',)
    ordering = ('-created_at',)


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = ('advocate', 'client_name', 'case_type', 'status', 'hearing_date', 'created_at')
    list_filter = ('status', 'case_type')
    search_fields = ('advocate__email', 'client_name')
    ordering = ('-created_at',)


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'to_email', 'email_type', 'status', 'created_at')
    list_filter = ('email_type', 'status')
    search_fields = ('to_email',)
    ordering = ('-created_at',)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'tag', 'created_at')
    list_filter = ('tag',)
    search_fields = ('title', 'content')
    ordering = ('-created_at',)
