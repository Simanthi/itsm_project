# itsm_project/incidents/admin.py
from django.contrib import admin
from .models import Incident, IncidentUpdate


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "status",
        "priority",
        "impact",
        "reported_by",
        "assigned_to",
        "created_at",
        "resolved_at",
    )
    list_filter = ("status", "priority", "impact", "urgency", "created_at")
    search_fields = ("title", "description", "resolution_notes")
    raw_id_fields = (
        "reported_by",
        "assigned_to",
        "related_asset",
        "related_ci",
    )  # Links to User, Asset, CI
    date_hierarchy = "created_at"


@admin.register(IncidentUpdate)
class IncidentUpdateAdmin(admin.ModelAdmin):
    list_display = ("incident", "updated_by", "timestamp", "new_status", "new_priority")
    list_filter = ("timestamp", "new_status", "new_priority")
    search_fields = ("incident__title", "comment")
    raw_id_fields = ("incident", "updated_by")
