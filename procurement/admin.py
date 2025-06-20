from django.contrib import admin
from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    PurchaseRequestMemoSequence, PurchaseOrderSequence, CheckRequestSequence
)

# Register your models here.


class PurchaseRequestMemoAdmin(admin.ModelAdmin):
    list_display = ('iom_id', 'item_description', 'requested_by', 'request_date', 'status', 'estimated_cost', 'approver')
    list_filter = ('status', 'request_date', 'requested_by', 'approver')
    search_fields = ('iom_id', 'item_description', 'reason', 'requested_by__username', 'approver__username')
    readonly_fields = ('request_date', 'decision_date', 'iom_id')
    fieldsets = (
        (None, {
            'fields': ('iom_id', 'item_description', 'quantity', 'reason', 'estimated_cost')
        }),
        ('Requester Information', {
            'fields': ('requested_by', 'request_date')
        }),
        ('Approval Information', {
            'fields': ('status', 'approver', 'decision_date', 'approver_comments')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk:  # If this is a new object
            obj.requested_by = request.user
        # ID is generated in model's save method
        super().save_model(request, obj, form, change)


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    readonly_fields = ('total_price',)


class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'vendor', 'order_date', 'total_amount', 'status', 'created_by')
    list_filter = ('status', 'order_date', 'vendor', 'created_by')
    search_fields = ('po_number', 'vendor__name', 'order_items__item_description')
    inlines = [OrderItemInline]
    readonly_fields = ('created_at', 'updated_at', 'total_amount', 'po_number') # Made po_number readonly
    fieldsets = (
        (None, {
            'fields': ('po_number', 'internal_office_memo', 'vendor')
        }),
        ('Order Details', {
            'fields': ('order_date', 'expected_delivery_date', 'shipping_address', 'notes')
        }),
        ('Status and Financials', {
            'fields': ('status', 'total_amount')
        }),
        ('System Information', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not obj.pk: # If new
            obj.created_by = request.user
        # ID (po_number) is generated in model's save method
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Recalculate total amount after related objects (OrderItems) are saved
        # Ensure instance is saved before calculating total amount if it depends on related items
        if form.instance.pk: # Ensure the instance is saved and has a PK
            form.instance.total_amount = form.instance.calculate_total_amount()
            form.instance.save(update_fields=['total_amount'])


class CheckRequestAdmin(admin.ModelAdmin):
    list_display = ('cr_id', 'payee_name', 'amount', 'request_date', 'status', 'requested_by', 'purchase_order_link')
    list_filter = ('status', 'request_date', 'payment_method', 'requested_by')
    search_fields = ('cr_id', 'payee_name', 'reason_for_payment', 'purchase_order__po_number', 'invoice_number')
    readonly_fields = ('request_date', 'accounts_approval_date', 'payment_date', 'cr_id')
    fieldsets = (
        (None, {
            'fields': ('cr_id', 'purchase_order', 'invoice_number', 'invoice_date', 'amount', 'payee_name', 'payee_address', 'reason_for_payment')
        }),
        ('Requestor Information', {
            'fields': ('requested_by', 'request_date')
        }),
        ('Approval and Payment Status', {
            'fields': ('status', 'approved_by_accounts', 'accounts_approval_date', 'accounts_comments')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'payment_date', 'transaction_id', 'payment_notes')
        }),
    )

    def purchase_order_link(self, obj):
        from django.urls import reverse
        from django.utils.html import format_html
        if obj.purchase_order:
            link = reverse("admin:procurement_purchaseorder_change", args=[obj.purchase_order.id])
            return format_html('<a href="{}">{}</a>', link, obj.purchase_order.po_number)
        return "N/A"
    purchase_order_link.short_description = 'Purchase Order'

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.requested_by = request.user
        # ID is generated in model's save method
        super().save_model(request, obj, form, change)


admin.site.register(PurchaseRequestMemo, PurchaseRequestMemoAdmin)
admin.site.register(PurchaseOrder, PurchaseOrderAdmin)
admin.site.register(OrderItem) # Can be registered standalone or just used as inline
admin.site.register(CheckRequest, CheckRequestAdmin)

# Register Sequence Models (optional, but good for visibility/manual adjustment if ever needed)
# These typically don't need a custom admin class unless specific actions are required.
admin.site.register(PurchaseRequestMemoSequence)
admin.site.register(PurchaseOrderSequence)
admin.site.register(CheckRequestSequence)
