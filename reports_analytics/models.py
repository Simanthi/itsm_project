# itsm_project/reports_analytics/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# This app might not need its own models initially, as it will primarily query
# data from other apps (Assets, Incidents, etc.) for reporting.

# You could add models later for:
# - SavedReport: To store user-defined report configurations (e.g., filters, columns)
# - DashboardConfig: To store dashboard layouts and widgets for users
# - ReportDataCache: If you need to cache complex report results

class SavedReport(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    report_type = models.CharField(max_length=100, help_text="e.g., 'Incident Summary', 'Asset Inventory'")
    # Store parameters for the report (e.g., JSONField for filters)
    parameters = models.JSONField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Saved Report"
        verbose_name_plural = "Saved Reports"

    def __str__(self):
        return self.name