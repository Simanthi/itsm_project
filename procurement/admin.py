from django.contrib import admin
from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment,
    ProcurementIDSequence, # Import the new sequence model
    ApprovalRule, ApprovalStep, ApprovalDelegation # Import new approval models
)
from simple_history.admin import SimpleHistoryAdmin
from django.utils.translation import gettext_lazy as _

# Admin configuration for ProcurementIDSequence
@admin.register(ProcurementIDSequence)
class ProcurementIDSequenceAdmin(admin.ModelAdmin): # Not using SimpleHistoryAdmin for this simple config model
    list_display = ('prefix', 'current_alpha_part_char1', 'current_alpha_part_char2', 'current_numeric_part', '__str__')
    readonly_fields = ('prefix',) # Prefix should not be changed after creation
    # Allow editing of sequence parts for manual reset/adjustment if absolutely necessary, but with caution.

# Admin configuration for PurchaseRequestMemo
@admin.register(PurchaseRequestMemo)
class PurchaseRequestMemoAdmin(SimpleHistoryAdmin):
    list_display = ('iom_id', 'item_description', 'requested_by', 'request_date', 'status', 'priority', 'department', 'project', 'estimated_cost')
    list_filter = ('status', 'priority', 'request_date', 'department', 'project')
    search_fields = ('iom_id', 'item_description', 'requested_by__username', 'reason')
    readonly_fields = ('request_date', 'iom_id') # iom_id if auto-generated
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
    # Add inlines if needed, e.g., for comments or history if not using simple_history directly

# Inline admin for OrderItem to be used in PurchaseOrderAdmin
class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1 # Number of empty forms to display
    fields = ('item_description', 'product_code', 'quantity', 'unit_price', 'gl_account',
              'received_quantity', 'line_item_status', 'tax_rate',
              'discount_type', 'discount_value', 'total_price')
    readonly_fields = ('total_price',) # total_price is a property

# Admin configuration for PurchaseOrder
@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(SimpleHistoryAdmin):
    list_display = ('po_number', 'vendor', 'order_date', 'total_amount', 'status', 'po_type', 'currency', 'created_by')
    list_filter = ('status', 'po_type', 'order_date', 'vendor', 'currency')
    search_fields = ('po_number', 'vendor__name', 'internal_office_memo__iom_id')
    readonly_fields = ('created_at', 'updated_at', 'po_number', 'total_amount') # po_number if auto-generated
    inlines = [OrderItemInline]
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
        if not obj.pk: # If creating a new PO
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
        # Recalculate total amount after order items might have changed via inline
        obj.total_amount = obj.calculate_total_amount()
        obj.save(update_fields=['total_amount'])

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Recalculate total amount after order items might have changed via inline
        form.instance.total_amount = form.instance.calculate_total_amount()
        form.instance.save(update_fields=['total_amount'])


# Admin configuration for CheckRequest
@admin.register(CheckRequest)
class CheckRequestAdmin(SimpleHistoryAdmin):
    list_display = ('cr_id', 'payee_name', 'amount', 'currency', 'status', 'request_date', 'requested_by', 'purchase_order', 'is_urgent')
    list_filter = ('status', 'request_date', 'is_urgent', 'currency', 'payment_method', 'expense_category')
    search_fields = ('cr_id', 'payee_name', 'purchase_order__po_number', 'invoice_number', 'reason_for_payment')
    readonly_fields = ('request_date', 'cr_id') # cr_id if auto-generated
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
            'classes': ('collapse',), # Collapsible section
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
        if not obj.pk: # If creating a new CR
            obj.requested_by = request.user
        super().save_model(request, obj, form, change)

# Registering common models for basic admin management
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

# Note: OrderItem is managed inline with PurchaseOrder, so it's not registered separately by default.
# If separate management is needed:
# @admin.register(OrderItem)
# class OrderItemAdmin(SimpleHistoryAdmin):
#     list_display = ('purchase_order', 'item_description', 'quantity', 'unit_price', 'total_price')
#     readonly_fields = ('total_price',)


@admin.register(ApprovalRule)
class ApprovalRuleAdmin(SimpleHistoryAdmin):
    list_display = ('name', 'order', 'min_amount', 'max_amount', 'approver_user', 'approver_group', 'is_active', 'approval_level_name')
    list_filter = ('is_active', 'approver_user', 'approver_group', 'applies_to_all_departments', 'applies_to_all_projects')
    search_fields = ('name', 'approval_level_name', 'approver_user__username', 'approver_group__name')
    filter_horizontal = ('departments', 'projects') # More user-friendly for M2M
    fieldsets = (
        (None, {
            'fields': ('name', 'order', 'is_active', 'approval_level_name')
        }),
        (_('Conditions'), {
            'fields': (('min_amount', 'max_amount'),
                       'applies_to_all_departments', 'departments',
                       'applies_to_all_projects', 'projects')
        }),
        (_('Approver'), {
            'fields': ('approver_user', 'approver_group')
        }),
    )

    def get_form(self, request, obj=None, **kwargs):
        # Dynamically set help text for M2M fields if needed, or other form adjustments
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['departments'].help_text = _("Select departments if 'Applies to All Departments' is unchecked.")
        form.base_fields['projects'].help_text = _("Select projects if 'Applies to All Projects' is unchecked.")
        return form


class ApprovalStepInline(admin.TabularInline): # Or admin.StackedInline
    model = ApprovalStep
    extra = 0 # No extra forms by default, these are system-generated
    fields = ('step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date', 'rule_name_snapshot', 'comments')
    readonly_fields = ('step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date', 'rule_name_snapshot') # Mostly read-only

    def has_add_permission(self, request, obj=None):
        return False # Steps should not be added manually via admin inline

    def has_delete_permission(self, request, obj=None):
        return False # Steps should not be deleted manually via admin inline (use skip/cancel logic)

# Add ApprovalStepInline to PurchaseRequestMemoAdmin
PurchaseRequestMemoAdmin.inlines = [ApprovalStepInline]


@admin.register(ApprovalStep)
class ApprovalStepAdmin(SimpleHistoryAdmin):
    list_display = ('id', 'purchase_request_memo_link', 'step_order', 'status', 'assigned_approver_user', 'assigned_approver_group', 'approved_by', 'decision_date')
    list_filter = ('status', 'step_order', 'assigned_approver_user', 'assigned_approver_group', 'decision_date')
    search_fields = ('purchase_request_memo__iom_id', 'assigned_approver_user__username', 'assigned_approver_group__name', 'approved_by__username', 'rule_name_snapshot')
    readonly_fields = ('purchase_request_memo', 'approval_rule', 'rule_name_snapshot', 'step_order',
                       'assigned_approver_user', 'assigned_approver_group', 'status',
                       'approved_by', 'decision_date', 'comments',
                       'created_at', 'updated_at') # Essentially all fields are read-only from direct admin edit

    def purchase_request_memo_link(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        if obj.purchase_request_memo:
            link = reverse("admin:procurement_purchaserequestmemo_change", args=[obj.purchase_request_memo.id])
            return format_html('<a href="{}">{}</a>', link, obj.purchase_request_memo.iom_id)
        return "-"
    purchase_request_memo_link.short_description = _("IOM")

    def has_add_permission(self, request):
        return False # Steps are system-generated

    def has_change_permission(self, request, obj=None):
        return False # Actions on steps should go through the API/application logic

    def has_delete_permission(self, request, obj=None):
        # Allow deletion for superusers for cleanup, but generally no.
        return request.user.is_superuser


@admin.register(ApprovalDelegation)
class ApprovalDelegationAdmin(SimpleHistoryAdmin):
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
            # Optionally, default delegator to current user if not staff/superuser
            if not request.user.is_staff:
                kwargs["initial"] = request.user.id
                kwargs["disabled"] = True # Non-staff can only delegate for themselves
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser or request.user.is_staff:
            return qs
        return qs.filter(delegator=request.user) # Users only see their own delegations

    def save_model(self, request, obj, form, change):
        if not obj.delegator_id: # If delegator is not set (e.g. for non-staff creating)
            obj.delegator = request.user
        super().save_model(request, obj, form, change)
