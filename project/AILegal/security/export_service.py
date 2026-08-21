"""Export audit logs as CSV, Excel, PDF."""

import csv
import io
from datetime import datetime

from django.http import HttpResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph

from .models import AuditLog


def export_audit_csv(queryset) -> HttpResponse:
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="audit_logs_{datetime.now():%Y%m%d}.csv"'
    writer = csv.writer(response)
    writer.writerow(['Timestamp', 'User', 'Action', 'Resource', 'IP', 'Browser', 'OS'])
    for log in queryset:
        writer.writerow([
            log.created_at.isoformat(),
            log.user.email if log.user else 'System',
            log.action,
            f"{log.resource_type}:{log.resource_id}",
            log.ip_address or '',
            log.browser,
            log.os,
        ])
    return response


def export_audit_excel(queryset) -> HttpResponse:
    try:
        from openpyxl import Workbook
    except ImportError:
        return export_audit_csv(queryset)

    wb = Workbook()
    ws = wb.active
    ws.title = 'Audit Logs'
    ws.append(['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Old Value', 'New Value', 'IP'])
    for log in queryset:
        ws.append([
            log.created_at.isoformat(),
            log.user.email if log.user else 'System',
            log.action,
            log.resource_type,
            log.resource_id,
            str(log.old_value or ''),
            str(log.new_value or ''),
            str(log.ip_address or ''),
        ])
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    response = HttpResponse(
        buffer.read(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="audit_logs_{datetime.now():%Y%m%d}.xlsx"'
    return response


def export_audit_pdf(queryset) -> HttpResponse:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [Paragraph('Audit Logs Export', styles['Title'])]

    data = [['Timestamp', 'User', 'Action', 'IP']]
    for log in queryset[:500]:
        data.append([
            log.created_at.strftime('%Y-%m-%d %H:%M'),
            log.user.email if log.user else 'System',
            log.action[:30],
            str(log.ip_address or ''),
        ])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
    ]))
    elements.append(table)
    doc.build(elements)

    buffer.seek(0)
    response = HttpResponse(buffer.read(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="audit_logs_{datetime.now():%Y%m%d}.pdf"'
    return response
