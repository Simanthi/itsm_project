# itsm_project/service_requests/admin.py
from django.contrib import admin
from .models import ServiceRequest, ServiceRequestSequence
from simple_history.admin import SimpleHistoryAdmin # Added for model history


@admin.register(ServiceRequest)
class ServiceRequestAdmin(SimpleHistoryAdmin): # Changed from admin.ModelAdmin
    list_display = (
        "request_id",
        "title",
        "requested_by",
        "assigned_to",
        "status",
        "category",
        "priority",
        "created_at",
    )
    list_filter = ("status", "category", "priority", "created_at")
    search_fields = ("request_id", "title", "description", "resolution_notes")
    raw_id_fields = ("requested_by", "assigned_to")
    date_hierarchy = "created_at"
    readonly_fields = (
        "request_id",
    )  # Make sure the request_id is not editable in admin


@admin.register(ServiceRequestSequence)
class ServiceRequestSequenceAdmin(admin.ModelAdmin):
    list_display = (
        "current_alpha_part_char1",
        "current_alpha_part_char2",
        "current_numeric_part",
    )

    # Make sure this model can only have one instance edited
    def has_add_permission(self, request):
        return (
            not ServiceRequestSequence.objects.exists()
        )  # Only allow adding if no instance exists

    def has_delete_permission(self, request, obj=None):
        return False  # Prevent accidental deletion
