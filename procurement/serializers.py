import json # For parsing order_items_json
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest,
    ApprovalRule, ApprovalStep, ApprovalDelegation # Import main models
)
# Import common models directly from their source
from .common_models import Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment # Ensure this is correct if models moved
from assets.models import Vendor
from assets.serializers import VendorSerializer
from django.contrib.auth.models import Group
from django.contrib.contenttypes.models import ContentType # For GFK representation in ApprovalStepSerializer

# Import generic_iom models for M2M fields in ApprovalRuleSerializer
# This might require careful handling of Django's app loading sequence.
# If generic_iom.models is not ready when procurement.serializers is loaded, it could fail.
# A string reference 'generic_iom.IOMTemplate' might be safer if issues arise.
from generic_iom.models import IOMTemplate, IOMCategory, GenericIOM
# If IOMTemplateSerializer and IOMCategorySerializer are needed for nesting, import them:
# from generic_iom.serializers import IOMTemplateSerializer, IOMCategorySerializer # Causes circular import
# For M2M fields, usually PrimaryKeyRelatedField is sufficient for write, StringRelatedField for read.

User = get_user_model()

# A simple serializer for GenericIOM to be nested in PurchaseOrderSerializer
class SimpleGenericIOMSerializer(serializers.ModelSerializer):
    class Meta:
        model = GenericIOM
        fields = ['id', 'gim_id', 'subject', 'status'] # Basic info

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
    vendor_name = serializers.StringRelatedField(source='vendor.name', read_only=True) # Assuming vendor is FK on Contract
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
    vendor_name = serializers.StringRelatedField(source='vendor.name', read_only=True) # Assuming vendor is FK on RecurringPayment
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
            'requested_by_username', # read_only as it's from source
            'request_date', 'status', 'approver', 'approver_username',
            'decision_date', 'approver_comments', 'department_name', 'project_name',
            'suggested_vendor_name',
            'requested_by' # Should be read-only as it's set by the view
        ]

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
    order_items = OrderItemSerializer(many=True, required=False) # Not required if order_items_json is used
    vendor_details = VendorSerializer(source='vendor', read_only=True) # Assuming VendorSerializer exists and is suitable
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    internal_office_memo_details = PurchaseRequestMemoSerializer(source='internal_office_memo', read_only=True, allow_null=True)
    generic_iom_purchase_request_details = SimpleGenericIOMSerializer(source='generic_iom_purchase_request', read_only=True, allow_null=True)
    related_contract_details = serializers.StringRelatedField(source='related_contract', read_only=True)
    # For handling JSON string input for order items, e.g. from multipart forms
    order_items_json = serializers.CharField(write_only=True, required=False, allow_blank=True, help_text="JSON string of order items.")


    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number',
            'internal_office_memo', 'internal_office_memo_details', # Legacy PRM link
            'generic_iom_purchase_request', 'generic_iom_purchase_request_details', # New GenericIOM PRM link
            'vendor', 'vendor_details',
            'order_date', 'expected_delivery_date',
            'total_amount', 'status',
            'created_by', 'created_by_username',
            'created_at', 'updated_at',
            'shipping_address', 'notes',
            'payment_terms', 'shipping_method', 'billing_address', 'po_type',
            'related_contract', 'related_contract_details', 'attachments', 'revision_number', 'currency',
            'order_items', 'order_items_json' # Added order_items_json
        ]
        read_only_fields = [
            'po_number', # Assuming system-generated
            'total_amount', # Calculated
            'created_by_username', 'created_at', 'updated_at',
            'vendor_details', 'internal_office_memo_details', 'generic_iom_purchase_request_details', 'related_contract_details'
        ]
        # `created_by` is typically set in the view.

    def validate_order_items_json(self, value):
        """
        Check that order_items_json is a valid JSON string.
        The actual parsing and validation of items will happen in create/update.
        """
        if not value: # Allow blank or null if field allows (it does: required=False, allow_blank=True)
            return value
        try:
            json.loads(value)
        except json.JSONDecodeError:
            raise serializers.ValidationError("Invalid JSON format for order items.")
        return value

    def _process_order_items(self, po_instance, order_items_data):
        po_instance.order_items.all().delete() # Simple: delete existing, then create new
        current_total_amount = 0
        for item_data_original in order_items_data:
            item_data = item_data_original.copy() # Avoid modifying original dict from validated_data
            # Adjust FKs for direct model creation: 'field_name': pk -> 'field_name_id': pk
            if 'gl_account' in item_data and not isinstance(item_data['gl_account'], GLAccount):
                item_data['gl_account_id'] = item_data.pop('gl_account')
            # Add similar adjustments for other FKs in OrderItem if any (e.g., 'asset')

            # Ensure numeric types are correct before direct model creation
            from decimal import Decimal, InvalidOperation
            decimal_fields = ['unit_price', 'tax_rate', 'discount_value']
            for field_name in decimal_fields:
                if field_name in item_data and item_data[field_name] is not None:
                    try:
                        item_data[field_name] = Decimal(str(item_data[field_name]))
                    except InvalidOperation:
                        # Handle error or raise validation error earlier if possible
                        raise serializers.ValidationError({f'order_items.{field_name}': 'Invalid decimal value.'})

            integer_fields = ['quantity', 'received_quantity']
            for field_name in integer_fields:
                if field_name in item_data and item_data[field_name] is not None:
                    try:
                        item_data[field_name] = int(item_data[field_name])
                    except ValueError:
                        raise serializers.ValidationError({f'order_items.{field_name}': 'Invalid integer value.'})
                elif field_name == 'received_quantity': # Explicitly default received_quantity if None or not present
                    item_data[field_name] = 0


            # Ensure received_quantity defaults to 0 if not provided or None, to respect model default
            if item_data.get('received_quantity') is None:
                item_data['received_quantity'] = 0

            item = OrderItem.objects.create(purchase_order=po_instance, **item_data)
            current_total_amount += item.total_price
        po_instance.total_amount = current_total_amount
        # The caller of _process_order_items should save po_instance

    def create(self, validated_data):
        order_items_list = validated_data.pop('order_items', [])
        order_items_json_str = validated_data.pop('order_items_json', None)

        if order_items_json_str:
            try:
                order_items_list = json.loads(order_items_json_str)
            except json.JSONDecodeError:
                raise serializers.ValidationError({'order_items_json': 'Invalid JSON format.'})

        # Ensure created_by is set, typically done in view's perform_create
        # If user is in context (e.g. from view), could also do:
        # validated_data['created_by'] = self.context['request'].user

        po = PurchaseOrder.objects.create(**validated_data)

        if order_items_list: # If there are items from either source
            self._process_order_items(po, order_items_list)
            po.save(update_fields=['total_amount']) # Save again to store calculated total

        return po

    def update(self, instance, validated_data):
        order_items_list = validated_data.pop('order_items', None) # Standard list of dicts
        order_items_json_str = validated_data.pop('order_items_json', None) # JSON string

        # Determine the source of order items data
        actual_order_items_data = None
        if order_items_json_str:
            try:
                actual_order_items_data = json.loads(order_items_json_str)
            except json.JSONDecodeError:
                raise serializers.ValidationError({'order_items_json': 'Invalid JSON format.'})
        elif order_items_list is not None: # Check if 'order_items' was explicitly passed (even if empty list)
            actual_order_items_data = order_items_list


        # Update other PO fields first
        instance = super().update(instance, validated_data)

        if actual_order_items_data is not None: # If items were provided (from json or direct list)
            self._process_order_items(instance, actual_order_items_data)
            instance.save(update_fields=['total_amount']) # Save PO with new total
        else:
            # If order items were not part of the update payload,
            # but other PO fields might have changed (e.g. tax for whole PO if that was a thing)
            # we might need to recalculate if items existed.
            # For now, if no items data in payload, total_amount is not recalculated from items here.
            # It's better if total_amount is always derived from items.
            # If items are not touched, total_amount should not change unless other PO-level factors change it.
            # Let's ensure it's recalculated if items exist, regardless of payload, to be safe.
            if instance.order_items.exists() and actual_order_items_data is None:
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


# Serializers for Approval Workflow

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class ApprovalRuleSerializer(serializers.ModelSerializer):
    departments_details = DepartmentSerializer(source='departments', many=True, read_only=True)
    projects_details = ProjectSerializer(source='projects', many=True, read_only=True)
    approver_user_details = serializers.StringRelatedField(source='approver_user', read_only=True)
    approver_group_details = GroupSerializer(source='approver_group', read_only=True)

    class Meta:
        model = ApprovalRule
        fields = [
            'id', 'name', 'order', 'min_amount', 'max_amount',
            'applies_to_all_departments', 'departments', 'departments_details',
            'applies_to_all_projects', 'projects', 'projects_details',
            'approver_user', 'approver_user_details',
            'approver_group', 'approver_group_details',
            'approval_level_name', 'is_active'
        ]
        # `departments` and `projects` are writable with lists of IDs.
        # For `generic_iom` type rules:
        # `applicable_iom_templates` and `applicable_iom_categories` are also writable M2M by ID.
        # Consider adding their details for read if needed, similar to departments_details.

class ContentObjectRelatedField(serializers.RelatedField):
    """
    A custom field to represent the GFK 'content_object'.
    """
    def to_representation(self, value):
        if isinstance(value, PurchaseRequestMemo):
            return f"PurchaseRequestMemo: {value.iom_id} - {value.item_description[:30]}..."
        elif isinstance(value, GenericIOM): # Requires GenericIOM to be imported
            return f"GenericIOM: {value.gim_id} - {value.subject[:30]}..."
        return f"Unknown: ID {value.pk}"

    # to_internal_value is not needed if this field is read-only for the GFK itself.
    # Writing to GFK is handled by content_type_id and object_id.

class ApprovalStepSerializer(serializers.ModelSerializer):
    # GFK fields for writing (if needed, though steps are usually system-created)
    # content_type = serializers.PrimaryKeyRelatedField(queryset=ContentType.objects.all(), write_only=True)
    # object_id = serializers.IntegerField(write_only=True)

    # Representation for content_object
    content_object_display = serializers.SerializerMethodField(read_only=True)
    content_object_url = serializers.SerializerMethodField(read_only=True)


    approval_rule_name = serializers.CharField(source='approval_rule.name', read_only=True, allow_null=True)
    assigned_approver_user_name = serializers.CharField(source='assigned_approver_user.username', read_only=True, allow_null=True)
    original_assigned_approver_user_name = serializers.CharField(source='original_assigned_approver_user.username', read_only=True, allow_null=True)
    assigned_approver_group_name = serializers.CharField(source='assigned_approver_group.name', read_only=True, allow_null=True)
    actioned_by_user_name = serializers.CharField(source='approved_by.username', read_only=True, allow_null=True) # 'approved_by' is the field name for actioner
    status_display = serializers.CharField(source='get_status_display', read_only=True)


    class Meta:
        model = ApprovalStep
        fields = [
            'id',
            # 'content_type', 'object_id', # Expose if direct write to GFK is needed
            'content_object_display', 'content_object_url', # Custom representations of the GFK
            'approval_rule', 'approval_rule_name', 'rule_name_snapshot', 'step_order',
            'assigned_approver_user', 'assigned_approver_user_name',
            'original_assigned_approver_user', 'original_assigned_approver_user_name',
            'assigned_approver_group', 'assigned_approver_group_name',
            'status', 'status_display', 'approved_by', 'actioned_by_user_name',
            'decision_date', 'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'content_object_display', 'content_object_url',
            'approval_rule_name', 'rule_name_snapshot',
            'assigned_approver_user_name', 'original_assigned_approver_user_name',
            'assigned_approver_group_name',
            'actioned_by_user_name', 'status_display',
            'created_at', 'updated_at',
        ]

    def get_content_object_display(self, obj: ApprovalStep):
        if obj.content_object:
            if isinstance(obj.content_object, PurchaseRequestMemo):
                return f"PRM: {obj.content_object.iom_id or obj.content_object.pk} - {obj.content_object.item_description[:30]}..."
            elif isinstance(obj.content_object, GenericIOM):
                return f"GIM: {obj.content_object.gim_id or obj.content_object.pk} - {obj.content_object.subject[:30]}..."
            return str(obj.content_object)
        return None

    def get_content_object_url(self, obj: ApprovalStep):
        # This requires frontend URL structure knowledge or backend reverse for admin
        # For frontend, it's more direct to construct on frontend from type and ID.
        # For now, let's return a placeholder or a backend admin URL if useful.
        if obj.content_object:
            if isinstance(obj.content_object, PurchaseRequestMemo):
                return f"/procurement/iom/view/{obj.object_id}" # Example frontend path
            elif isinstance(obj.content_object, GenericIOM):
                return f"/ioms/view/{obj.object_id}" # Example frontend path
        return None


class ApprovalDelegationSerializer(serializers.ModelSerializer):
    delegator_username = serializers.CharField(source='delegator.username', read_only=True)
    delegatee_username = serializers.CharField(source='delegatee.username', read_only=True)

    class Meta:
        model = ApprovalDelegation
        fields = [
            'id', 'delegator', 'delegator_username', 'delegatee', 'delegatee_username',
            'start_date', 'end_date', 'reason', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['delegator_username', 'delegatee_username', 'created_at', 'updated_at']

    def validate(self, data):
        # Ensure delegator is the request.user or admin
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if data.get('delegator') and data.get('delegator') != request.user and not request.user.is_staff:
                raise serializers.ValidationError("You can only create delegations for yourself.")
            # When creating, set delegator if not provided
            if not data.get('delegator') and request.method == 'POST': # Check if it's a create operation
                 data['delegator'] = request.user

        # Model's clean method handles other validations (delegator!=delegatee, end_date > start_date)
        # but DRF serializers don't call model.clean() automatically.
        # We can call it explicitly or replicate logic.
        if data.get('delegator') == data.get('delegatee'):
            raise serializers.ValidationError("Delegator and Delegatee cannot be the same user.")
        if data.get('start_date') and data.get('end_date') and data.get('start_date') >= data.get('end_date'):
            raise serializers.ValidationError("End date must be after start date.")
        return data