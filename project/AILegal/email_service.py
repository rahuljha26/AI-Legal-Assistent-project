import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import time
import re
from django.template.loader import render_to_string
from dotenv import load_dotenv

from .models import EmailLog
from .gemini_email_service import draft_email_with_gemini
from .pdf_service import generate_advice_pdf

load_dotenv()

EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_FROM_NAME = os.environ.get('EMAIL_FROM_NAME', 'AI Legal Assistant')

def validate_email_format(email: str) -> bool:
    """Validates email format using regex."""
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def send_legal_email(user, to_email: str, email_type: str, context: dict, attach_pdf: bool = False, extra_attachments: list = None) -> dict:
    """
    Sends an email with optional Gemini AI drafted body and PDF attachment.
    Logs the outcome to the EmailLog model.
    """
    if not validate_email_format(to_email):
        return {"success": False, "message": "Invalid email format."}
        
    subject_map = {
        'advice': "Your AI Legal Advice — AI Legal Assistant",
        'document': "Your Generated Legal Document — AI Legal Assistant",
        'case_summary': "Case Summary Report — AI Legal Assistant",
        'lawyer_communication': context.get('subject', "Legal Inquiry — Nyaya AI Assistant")
    }
    subject = subject_map.get(email_type, "Update from AI Legal Assistant")
    
    gemini_used = False
    ai_drafted_body = context.get('ai_drafted_body')
    
    # 1. Draft with Gemini (limit to 10 per day per user for testing quota)
    # Fast skip if user has hit their auto-drafting quota or if body is pre-drafted
    if user and not ai_drafted_body:
        from django.utils import timezone
        from datetime import timedelta
        today = timezone.now() - timedelta(hours=24)
        gemini_count = EmailLog.objects.filter(user=user, gemini_used=True, created_at__gte=today).count()
        
        if gemini_count < 10:
            user_name = context.get('user_name', user.full_name if hasattr(user, 'full_name') else 'Customer')
            ai_drafted_body = draft_email_with_gemini(user_name, email_type, context)
            if ai_drafted_body:
                gemini_used = True
                
    # Add body to context
    context['ai_drafted_body'] = ai_drafted_body
    
    # 2. Render HTML Template
    template_name = f"emails/{email_type}_email.html"
    try:
        html_content = render_to_string(template_name, context)
    except Exception as e:
        # Fallback if template doesn't exist
        html_content = f"<h1>{subject}</h1><p>{ai_drafted_body or 'Please find your legal information attached.'}</p>"

    # 3. Build MIME Message
    msg = MIMEMultipart("alternative")
    msg['From'] = f"{EMAIL_FROM_NAME} <{EMAIL_HOST_USER}>"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg['Reply-To'] = EMAIL_HOST_USER
    
    msg.attach(MIMEText(html_content, 'html'))
    
    pdf_path = None
    if attach_pdf:
        try:
            pdf_path = generate_advice_pdf(email_type, context)
            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    part = MIMEApplication(f.read(), Name=os.path.basename(pdf_path))
                part['Content-Disposition'] = f'attachment; filename="{os.path.basename(pdf_path)}"'
                msg.attach(part)
        except Exception as e:
            print(f"PDF Attachment failed: {e}")
            
    if extra_attachments:
        for attachment in extra_attachments:
            try:
                part = MIMEApplication(attachment['content'], Name=attachment['filename'])
                part['Content-Disposition'] = f'attachment; filename="{attachment["filename"]}"'
                msg.attach(part)
            except Exception as e:
                print(f"Extra attachment failed: {e}")
            
    # 4. Connect to SMTP and Send with 3 Retry Logic
    max_retries = 3
    success = False
    error_message = ""
    
    # If credentials aren't configured, skip SMTP and simulate success (for dev without env vars)
    if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
        print(f"DEV MODE: Simulating email send to {to_email}")
        print(f"Subject: {subject}")
        print(html_content[:200] + "...")
        success = True
    else:
        for attempt in range(max_retries):
            try:
                server = smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=10)
                server.starttls()
                server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
                server.sendmail(EMAIL_HOST_USER, [to_email], msg.as_string())
                server.quit()
                success = True
                break
            except Exception as e:
                error_message = str(e)
                time.sleep(2)
                
    # Cleanup PDF
    if pdf_path and os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except:
            pass
            
    # 5. Log to Database
    EmailLog.objects.create(
        user=user if not getattr(user, 'is_anonymous', True) else None,
        to_email=to_email,
        subject=subject,
        email_type=email_type,
        status='sent' if success else 'failed',
        error_message=error_message if not success else "",
        gemini_used=gemini_used
    )
    
    if success:
        return {"success": True, "message": f"Email sent successfully to {to_email}"}
    return {"success": False, "message": "Failed to send email. Please try again.", "error": error_message}
