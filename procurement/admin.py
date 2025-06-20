from django.contrib import admin
from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment
)
from simple_history.admin import SimpleHistoryAdmin

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
