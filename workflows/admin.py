# itsm_project/workflows/admin.py
from django.contrib import admin
from .models import ApprovalRequest, ApprovalStep


# Inline for ApprovalSteps within an ApprovalRequest (optional but nice)
class ApprovalStepInline(admin.TabularInline):
    model = ApprovalStep
    extra = 0  # Don't show empty extra forms
    raw_id_fields = ("approver",)


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "initiated_by",
        "current_status",
        "content_object",
        "created_at",
    )
    list_filter = ("current_status", "created_at")
    search_fields = ("title", "description", "initiated_by__username")
    raw_id_fields = ("initiated_by",)
    inlines = [ApprovalStepInline]  # Show steps directly on request admin page
    date_hierarchy = "created_at"


@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = (
        "approval_request",
        "step_order",
        "approver",
        "status",
        "approved_at",
    )
    list_filter = ("status", "step_order", "approved_at")
    search_fields = ("approval_request__title", "approver__username", "comments")
    raw_id_fields = ("approval_request", "approver")
