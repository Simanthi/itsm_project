from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment # Import common models
)
from assets.serializers import VendorSerializer
# It's good practice to also have serializers for the common models if they are to be represented in detail
# For now, we'll use PrimaryKeyRelatedField for FKs or simple string representations.

User = get_user_model()

# Serializers for Common Models (basic, can be expanded)
class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'name', 'department_code'] # Optimized for dropdowns

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'project_code'] # Optimized for dropdowns

class ContractSerializer(serializers.ModelSerializer):
    vendor_name = serializers.StringRelatedField(source='vendor', read_only=True)
    class Meta:
        model = Contract
        fields = ['id', 'contract_id', 'title', 'vendor', 'vendor_name'] # Optimized for dropdowns, include vendor for context

class GLAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = GLAccount
        fields = ['id', 'name', 'account_code'] # Optimized for dropdowns

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ['id', 'name'] # Optimized for dropdowns

class RecurringPaymentSerializer(serializers.ModelSerializer):
    vendor_name = serializers.StringRelatedField(source='vendor', read_only=True)
    class Meta:
        model = RecurringPayment
        fields = ['id', 'payment_name', 'vendor', 'vendor_name', 'amount', 'currency'] # Optimized


# Specific Vendor serializer for dropdowns if assets.VendorSerializer is too broad
# assets.models.Vendor is imported as 'Vendor' in this file due to `from assets.serializers import VendorSerializer`
# and then `from .models import Vendor`. This is confusing.
# Let's use the fully qualified path for the asset vendor here for clarity, or ensure one consistent import.
# For now, assuming `Vendor` from `.models` is NOT `assets.models.Vendor`.
# The `VendorSerializer` from `assets.serializers` is already quite comprehensive.
# If a simpler one is needed for dropdowns, it should explicitly use `assets.models.Vendor`.

# Let's assume assets.serializers.VendorSerializer is sufficient for now or can be adjusted.
# If a specific dropdown serializer for assets.models.Vendor is needed:
# from assets.models import Vendor as AssetVendorModel
# class AssetVendorDropdownSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = AssetVendorModel
#         fields = ['id', 'name']


class PurchaseRequestMemoSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    approver_username = serializers.CharField(source='approver.username', read_only=True, allow_null=True)
    # For FKs to common models, using PrimaryKeyRelatedField for write, StringRelatedField for read.
    # This provides flexibility. Alternatively, use nested serializers if detailed info is needed.
    department_name = serializers.StringRelatedField(source='department', read_only=True)
    project_name = serializers.StringRelatedField(source='project', read_only=True)
    suggested_vendor_name = serializers.StringRelatedField(source='suggested_vendor', read_only=True)

    class Meta:
        model = PurchaseRequestMemo
        fields = [
            'id', 'iom_id', 'item_description', 'quantity', 'reason', 'estimated_cost',
            'requested_by', 'requested_by_username', 'request_date', 'status',
            'approver', 'approver_username', 'decision_date', 'approver_comments',
            'department', 'department_name', 'project', 'project_name', 'priority',
            'required_delivery_date', 'suggested_vendor', 'suggested_vendor_name', 'attachments'
        ]
        read_only_fields = [
            'iom_id', # Assuming this is system-generated or handled by model logic
            'request_date', 'status', 'approver', 'approver_username',
            'decision_date', 'approver_comments', 'department_name', 'project_name',
            'suggested_vendor_name'
        ]
        # `requested_by` is typically set in the view using `perform_create`.

class OrderItemSerializer(serializers.ModelSerializer):
    gl_account_code = serializers.StringRelatedField(source='gl_account', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'item_description', 'quantity', 'unit_price', 'total_price',
            'product_code', 'gl_account', 'gl_account_code', 'received_quantity',
            'line_item_status', 'tax_rate',
            'discount_type', 'discount_value' # Replaced discount_percentage_or_amount
        ]
        read_only_fields = ['total_price', 'gl_account_code'] # total_price is a @property


class PurchaseOrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    vendor_details = VendorSerializer(source='vendor', read_only=True) # Assuming VendorSerializer exists and is suitable
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    internal_office_memo_details = PurchaseRequestMemoSerializer(source='internal_office_memo', read_only=True)
    related_contract_details = serializers.StringRelatedField(source='related_contract', read_only=True)


    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number',
            'internal_office_memo', 'internal_office_memo_details',
            'vendor', 'vendor_details',
            'order_date', 'expected_delivery_date',
            'total_amount', 'status',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
            'shipping_address', 'notes',
            'payment_terms', 'shipping_method', 'billing_address', 'po_type',
            'related_contract', 'related_contract_details', 'attachments', 'revision_number', 'currency',
            'order_items'
        ]
        read_only_fields = [
            'po_number', # Assuming system-generated
            'total_amount', # Calculated
            'created_by_username', 'created_at', 'updated_at',
            'vendor_details', 'internal_office_memo_details', 'related_contract_details'
        ]
        # `created_by` is typically set in the view.

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items', [])
        po = PurchaseOrder.objects.create(**validated_data)
        current_total_amount = 0
        for item_data in order_items_data:
            item = OrderItem.objects.create(purchase_order=po, **item_data)
            current_total_amount += item.total_price # Uses the @property from model
        po.total_amount = current_total_amount
        po.save(update_fields=['total_amount'])
        return po

    def update(self, instance, validated_data):
        order_items_data = validated_data.pop('order_items', None)
        # Handle FK updates for related_contract if provided as ID
        # related_contract_id = validated_data.pop('related_contract', None)
        # if related_contract_id:
        #     instance.related_contract_id = related_contract_id

        instance = super().update(instance, validated_data)

        if order_items_data is not None:
            # Simple approach: delete existing and create new ones.
            # More complex logic might be needed for partial updates of line items.
            instance.order_items.all().delete()
            current_total_amount = 0
            for item_data in order_items_data:
                item = OrderItem.objects.create(purchase_order=instance, **item_data)
                current_total_amount += item.total_price
            instance.total_amount = current_total_amount
            instance.save(update_fields=['total_amount'])
        else:
            # Recalculate total amount if order items were not part of the update
            # but other fields might have changed that affect it (though less likely for PO total)
            current_total_amount = sum(item.total_price for item in instance.order_items.all())
            if instance.total_amount != current_total_amount:
                 instance.total_amount = current_total_amount
                 instance.save(update_fields=['total_amount'])
        return instance


class CheckRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True, allow_null=True)
    approved_by_accounts_username = serializers.CharField(source='approved_by_accounts.username', read_only=True, allow_null=True)
    purchase_order_details = PurchaseOrderSerializer(source='purchase_order', read_only=True) # Nested PO details
    expense_category_name = serializers.StringRelatedField(source='expense_category', read_only=True)
    recurring_payment_details = serializers.StringRelatedField(source='recurring_payment', read_only=True)


    class Meta:
        model = CheckRequest
        fields = [
            'id', 'cr_id', 'purchase_order', 'purchase_order_details', 'invoice_number', 'invoice_date',
            'amount', 'payee_name', 'payee_address', 'reason_for_payment',
            'requested_by', 'requested_by_username', 'request_date', 'status',
            'approved_by_accounts', 'approved_by_accounts_username',
            'accounts_approval_date', 'accounts_comments',
            'payment_method', 'payment_date', 'transaction_id', 'payment_notes',
            'expense_category', 'expense_category_name', 'is_urgent',
            'recurring_payment', 'recurring_payment_details', 'attachments', 'currency'
        ]
        read_only_fields = [
            'cr_id', # Assuming system-generated
            'request_date', 'status',
            'requested_by_username',
            'approved_by_accounts', 'approved_by_accounts_username',
            'accounts_approval_date', 'accounts_comments',
            'purchase_order_details', 'expense_category_name', 'recurring_payment_details',
            # Payment fields are typically set by specific actions/roles
            'payment_method', 'payment_date', 'transaction_id', 'payment_notes'
        ]
        # `requested_by` set by view. `status` defaults.
        # `purchase_order`, `expense_category`, `recurring_payment` are writable by ID.
