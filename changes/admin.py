# itsm_project/changes/admin.py
from django.contrib import admin
from .models import ChangeRequest

@admin.register(ChangeRequest)
class ChangeRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'change_type', 'status', 'requested_by', 'assigned_to', 'planned_start_date', 'planned_end_date')
    list_filter = ('change_type', 'status', 'impact', 'planned_start_date')
    search_fields = ('title', 'description', 'justification', 'implementation_notes', 'rollback_plan')
    raw_id_fields = ('requested_by', 'assigned_to') # Links to User
    filter_horizontal = ('affected_cis',) # For ManyToMany fields
    date_hierarchy = 'created_at'