# itsm_project/reports_analytics/admin.py
from django.contrib import admin
from .models import SavedReport

@admin.register(SavedReport)
class SavedReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'report_type', 'created_by', 'created_at')
    list_filter = ('report_type', 'created_at')
    search_fields = ('name', 'description')
    raw_id_fields = ('created_by',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'report_type', 'parameters')
        }),
        ('Audit Info', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',), # Makes this section collapsible
        }),
    )