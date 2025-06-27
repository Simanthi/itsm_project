from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline # For ApprovalStep inline
from .models import IOMCategory, IOMTemplate, GenericIOM

# It's possible that ApprovalStep is needed for the inline.
# Ensure procurement.models can be imported.
try:
    from procurement.models import ApprovalStep
except ImportError:
    ApprovalStep = None

# Inline for ApprovalSteps if GFK is set up correctly
# This requires ApprovalStep to have its GFK fields (content_type, object_id)
# and for the admin to be able to use them.
if ApprovalStep:
    class ApprovalStepInline(GenericTabularInline):
        model = ApprovalStep
        fk_name = 'content_object' # This might not be needed if model GFK is standard
        # Or, if fk_name refers to a field on ApprovalStep that is the GFK itself,
        # it might just work by setting model = ApprovalStep.
        # Let's assume the GFK on ApprovalStep is correctly named 'content_object'.
        # Django's GenericTabularInline should handle it.

        fields = ('step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date', 'rule_name_snapshot', 'comments')
        readonly_fields = ('step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date', 'rule_name_snapshot', 'comments')
        extra = 0
        can_delete = False

        def has_add_permission(self, request, obj=None):
            return False

        # def has_change_permission(self, request, obj=None): # Allow viewing, but not direct change here
        #     return False


@admin.register(IOMCategory)
class IOMCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name',)

@admin.register(IOMTemplate)
class IOMTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'approval_type', 'is_active', 'created_by', 'created_at')
    list_filter = ('category', 'approval_type', 'is_active', 'created_at')
    search_fields = ('name', 'description', 'category__name')
    filter_horizontal = ('allowed_groups',) # Added for better M2M editing
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'category', 'is_active')
        }),
        ('Access Control', { # New fieldset for allowed_groups
            'fields': ('allowed_groups',)
        }),
        ('Approval Configuration', {
            'fields': ('approval_type', 'simple_approval_user', 'simple_approval_group')
        }),
        ('Fields Definition (JSON)', {
            'classes': ('collapse',), # Collapsible for large JSON
            'fields': ('fields_definition',)
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at'),
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
    # For fields_definition, a custom widget like django-jsoneditor or similar would be nice,
    # but default JSONField widget in recent Django versions is a decent textarea.

    def save_model(self, request, obj, form, change):
        if not obj.pk: # When creating a new template
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(GenericIOM)
class GenericIOMAdmin(admin.ModelAdmin):
    list_display = ('gim_id', 'subject', 'iom_template', 'status', 'created_by', 'created_at', 'published_at')
    list_filter = ('status', 'iom_template', 'created_at', 'published_at', 'iom_template__category')
    search_fields = ('gim_id', 'subject', 'created_by__username', 'iom_template__name', 'data_payload') # Searching JSONField might be DB dependent
    readonly_fields = ('gim_id', 'created_by', 'created_at', 'updated_at', 'published_at',
                       'simple_approver_action_by', 'simple_approval_action_at', 'simple_approval_comments',
                       'data_payload') # Making data_payload read-only in admin by default, viewable in a structured way if possible.

    fieldsets = (
        (None, {
            'fields': ('gim_id', 'subject', 'iom_template', 'status')
        }),
        ('Content (Read-Only in Admin - Manage via API/Frontend)', {
            'classes': ('collapse',),
            'fields': ('data_payload',) # Displaying JSON directly. A custom display would be better.
        }),
        ('Distribution', {
            'fields': ('to_users', 'to_groups')
        }),
        ('Parent Record Link (Optional)', {
            'fields': ('parent_content_type', 'parent_object_id')
        }),
        ('Simple Approval Details (if applicable)', {
            'classes': ('collapse',),
            'fields': ('simple_approver_action_by', 'simple_approval_action_at', 'simple_approval_comments')
        }),
        ('Audit', {
            'fields': ('created_by', 'created_at', 'updated_at', 'published_at'),
        }),
    )
    filter_horizontal = ('to_users', 'to_groups') # Better widget for M2M

    # Add ApprovalStepInline if ApprovalStep model is available and GFK works
    if ApprovalStep and GenericTabularInline:
        inlines = [ApprovalStepInline]

    def get_readonly_fields(self, request, obj=None):
        # Make all fields read-only if object already exists, for example
        # Or specific fields like 'iom_template' after creation
        if obj: # obj is not None, so it's an edit
            return self.readonly_fields + ('iom_template',)
        return self.readonly_fields

    # We generally don't want GenericIOMs to be created or fully edited via Admin
    # as the data_payload is tied to template's fields_definition.
    # Admin is more for viewing, status changes by admin, or minor corrections.
    # def has_add_permission(self, request):
    # return False # Optionally disable adding via admin

    # def has_change_permission(self, request, obj=None):
        # Allow some changes, e.g. status by admin, but not data_payload directly
        # return True

    # def has_delete_permission(self, request, obj=None):
        # return True # Or based on status/role

    # Custom display for data_payload would be good here, e.g. pretty-printed JSON
    # or rendering it based on template schema (complex for admin).
    # For now, default JSONField widget will show the raw JSON string.
