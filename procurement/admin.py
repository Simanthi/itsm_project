from django.contrib import admin
from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment,
    ProcurementIDSequence,
    ApprovalRule, ApprovalStep, ApprovalDelegation
)
from simple_history.admin import SimpleHistoryAdmin
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.admin import GenericTabularInline # For GFK inlines
from django.urls import reverse
from django.utils.html import format_html
from django.contrib.contenttypes.models import ContentType


@admin.register(ProcurementIDSequence)
class ProcurementIDSequenceAdmin(admin.ModelAdmin):
    list_display = ('prefix', 'current_alpha_part_char1', 'current_alpha_part_char2', 'current_numeric_part', '__str__')
    readonly_fields = ('prefix',)

# Generic Inline for ApprovalSteps to be used by any model that has approvals
class GenericApprovalStepInline(GenericTabularInline):
    model = ApprovalStep
    # fk_name = 'content_object' # Not needed if GFK is standard 'content_object'
    fields = ('step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date', 'rule_name_snapshot', 'comments')
    readonly_fields = ('step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date', 'rule_name_snapshot', 'comments')
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

@admin.register(PurchaseRequestMemo)
class PurchaseRequestMemoAdmin(SimpleHistoryAdmin):
    list_display = ('iom_id', 'item_description', 'requested_by', 'request_date', 'status', 'priority', 'department', 'project', 'estimated_cost')
    list_filter = ('status', 'priority', 'request_date', 'department', 'project')
    search_fields = ('iom_id', 'item_description', 'requested_by__username', 'reason')
    readonly_fields = ('request_date', 'iom_id')
    fieldsets = (
        (None, {
            'fields': ('iom_id', 'item_description', 'quantity', 'reason', 'estimated_cost', 'priority', 'required_delivery_date')
        }),
        ('Requester & Approver Information', {
            'fields': ('requested_by', 'request_date', 'approver', 'decision_date', 'approver_comments')
        }),
        ('Organizational Information', {
            'fields': ('department', 'project', 'suggested_vendor')
        }),
        ('Status & Attachments', {
            'fields': ('status', 'attachments')
        }),
    )
    inlines = [GenericApprovalStepInline] # Use the Generic Inline

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    fields = ('item_description', 'product_code', 'quantity', 'unit_price', 'gl_account',
              'received_quantity', 'line_item_status', 'tax_rate',
              'discount_type', 'discount_value', 'total_price')
    readonly_fields = ('total_price',)

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(SimpleHistoryAdmin):
    list_display = ('po_number', 'vendor', 'order_date', 'total_amount', 'status', 'po_type', 'currency', 'created_by')
    list_filter = ('status', 'po_type', 'order_date', 'vendor', 'currency')
    search_fields = ('po_number', 'vendor__name', 'internal_office_memo__iom_id')
    readonly_fields = ('created_at', 'updated_at', 'po_number', 'total_amount')
    inlines = [OrderItemInline]
    # ... (fieldsets remain the same) ...
    fieldsets = (
        (None, {
            'fields': ('po_number', 'internal_office_memo', 'vendor', 'order_date', 'expected_delivery_date', 'status', 'po_type')
        }),
        ('Financials & Terms', {
            'fields': ('total_amount', 'currency', 'payment_terms')
        }),
        ('Shipping & Address', {
            'fields': ('shipping_address', 'billing_address', 'shipping_method')
        }),
        ('Contract & Revisions', {
            'fields': ('related_contract', 'revision_number')
        }),
        ('System Information', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
        ('Notes & Attachments', {
            'fields': ('notes', 'attachments')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        obj.total_amount = obj.calculate_total_amount()
        obj.save(update_fields=['total_amount'])

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        form.instance.total_amount = form.instance.calculate_total_amount()
        form.instance.save(update_fields=['total_amount'])

@admin.register(CheckRequest)
class CheckRequestAdmin(SimpleHistoryAdmin):
    # ... (no changes needed for CheckRequestAdmin itself related to this error) ...
    list_display = ('cr_id', 'payee_name', 'amount', 'currency', 'status', 'request_date', 'requested_by', 'purchase_order', 'is_urgent')
    list_filter = ('status', 'request_date', 'is_urgent', 'currency', 'payment_method', 'expense_category')
    search_fields = ('cr_id', 'payee_name', 'purchase_order__po_number', 'invoice_number', 'reason_for_payment')
    readonly_fields = ('request_date', 'cr_id')
    fieldsets = (
        (None, {
            'fields': ('cr_id', 'purchase_order', 'invoice_number', 'invoice_date', 'reason_for_payment')
        }),
        ('Payment Details', {
            'fields': ('amount', 'currency', 'payee_name', 'payee_address', 'is_urgent')
        }),
        ('Categorization & Recurrence', {
            'fields': ('expense_category', 'recurring_payment')
        }),
        ('Requester & Status', {
            'fields': ('requested_by', 'request_date', 'status')
        }),
        ('Approval Information (Accounts)', {
            'classes': ('collapse',),
            'fields': ('approved_by_accounts', 'accounts_approval_date', 'accounts_comments')
        }),
        ('Payment Execution', {
            'classes': ('collapse',),
            'fields': ('payment_method', 'payment_date', 'transaction_id', 'payment_notes')
        }),
        ('Attachments', {
            'fields': ('attachments',)
        }),
    )
    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Department)
class DepartmentAdmin(SimpleHistoryAdmin):
    list_display = ('name', 'department_code')
    search_fields = ('name', 'department_code')

@admin.register(Project)
class ProjectAdmin(SimpleHistoryAdmin):
    list_display = ('name', 'project_code', 'start_date', 'end_date')
    search_fields = ('name', 'project_code')

@admin.register(Contract)
class ContractAdmin(SimpleHistoryAdmin):
    list_display = ('contract_id', 'title', 'vendor', 'start_date', 'end_date', 'renewal_reminder_date')
    list_filter = ('vendor', 'start_date', 'end_date')
    search_fields = ('contract_id', 'title', 'vendor__name')
    readonly_fields = ('contract_id',)

@admin.register(GLAccount)
class GLAccountAdmin(SimpleHistoryAdmin):
    list_display = ('account_code', 'name')
    search_fields = ('account_code', 'name')

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(SimpleHistoryAdmin):
    list_display = ('name',)
    search_fields = ('name',)

@admin.register(RecurringPayment)
class RecurringPaymentAdmin(SimpleHistoryAdmin):
    list_display = ('payment_name', 'vendor', 'amount', 'currency', 'frequency', 'next_due_date', 'is_active')
    list_filter = ('frequency', 'is_active', 'currency', 'vendor')
    search_fields = ('payment_name', 'vendor__name')


@admin.register(ApprovalRule)
class ApprovalRuleAdmin(SimpleHistoryAdmin):
    list_display = ('name', 'order', 'rule_type', 'min_amount', 'max_amount', 'approver_user', 'approver_group', 'is_active', 'approval_level_name')
    list_filter = ('rule_type', 'is_active', 'approver_user', 'approver_group', 'applies_to_all_departments', 'applies_to_all_projects')
    search_fields = ('name', 'approval_level_name', 'approver_user__username', 'approver_group__name')
    filter_horizontal = ('departments', 'projects', 'applicable_iom_templates', 'applicable_iom_categories')
    fieldsets = (
        (None, {
            'fields': ('name', 'order', 'is_active', 'approval_level_name', 'rule_type')
        }),
        (_('Conditions for Procurement Memo'), {
            'classes': ('collapse',),
            'fields': (('min_amount', 'max_amount'),
                       'applies_to_all_departments', 'departments',
                       'applies_to_all_projects', 'projects')
        }),
        (_('Conditions for Generic IOM'), {
            'classes': ('collapse',),
            'fields': ('applicable_iom_templates', 'applicable_iom_categories')
        }),
        (_('Approver'), {
            'fields': ('approver_user', 'approver_group')
        }),
    )
    # Note: help_texts for M2M fields are better set on the model itself if they are static.
    # Or, if dynamic based on rule_type, then get_form needs more complex logic.
    # For now, assuming model help_texts are sufficient.

@admin.register(ApprovalStep)
class ApprovalStepAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'content_object_link', 'step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date')
    list_filter = ('status', 'step_order', 'assigned_approver_user', 'assigned_approver_group', 'decision_date', 'content_type')
    search_fields = (
        'assigned_approver_user__username',
        'assigned_approver_group__name',
        'approved_by__username',
        'rule_name_snapshot',
        # Searching by content_object's specific fields (like iom_id or gim_id) is complex here.
        # Users can filter by content_type and then sort/manually find by object_id if needed.
    )
    readonly_fields = (
        'content_type', 'object_id', 'content_object_link_display', # Display GFK
        'approval_rule', 'rule_name_snapshot', 'step_order',
        'assigned_approver_user', 'assigned_approver_group', 'status',
        'approved_by', 'decision_date', 'comments',
        'created_at', 'updated_at'
    )

    def content_object_link(self, obj):
        if obj.content_object:
            # Get the admin URL for the content_object
            # e.g. admin:app_label_modelname_change
            app_label = obj.content_type.app_label
            model_name = obj.content_type.model
            try:
                url = reverse(f"admin:{app_label}_{model_name}_change", args=[obj.object_id])
                return format_html('<a href="{}">{}</a>', url, str(obj.content_object))
            except Exception: # Catch NoReverseMatch or other errors
                return str(obj.content_object) # Fallback to string representation
        return "-"
    content_object_link.short_description = _("Related Item")

    # To display the link in readonly_fields, we need a separate method that doesn't take 'obj' for the list_display version.
    def content_object_link_display(self, obj):
        return self.content_object_link(obj)
    content_object_link_display.short_description = _("Related Item (Link)")


    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False # Actions on steps should go through the API/application logic

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

@admin.register(ApprovalDelegation)
class ApprovalDelegationAdmin(SimpleHistoryAdmin):
    # ... (no changes needed for ApprovalDelegationAdmin) ...
    list_display = ('delegator', 'delegatee', 'start_date', 'end_date', 'is_active', 'reason')
    list_filter = ('is_active', 'start_date', 'end_date', 'delegator', 'delegatee')
    search_fields = ('delegator__username', 'delegatee__username', 'reason')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('delegator', 'delegatee', ('start_date', 'end_date'), 'is_active', 'reason')
        }),
        (_('System Information'), {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at')
        }),
    )
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "delegator":
            if not request.user.is_staff:
                kwargs["initial"] = request.user.id
                kwargs["disabled"] = True
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.is_staff:
            return qs
        return qs.filter(delegator=request.user)

    def save_model(self, request, obj, form, change):
        if not obj.delegator_id:
            obj.delegator = request.user
        super().save_model(request, obj, form, change)
