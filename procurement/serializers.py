from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest  # Added CheckRequest
from assets.serializers import VendorSerializer  # Corrected import path

User = get_user_model()


class PurchaseRequestMemoSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    approver_username = serializers.CharField(source='approver.username', read_only=True, allow_null=True)
    requested_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = PurchaseRequestMemo
        fields = [
            'id', 'iom_id', 'item_description', 'quantity', 'reason', 'estimated_cost',
            'requested_by', 'requested_by_username', 'request_date', 'status',
            'approver', 'approver_username', 'decision_date', 'approver_comments'
        ]
        read_only_fields = [
            'iom_id', 'request_date',
            'status',
            'approver',
            'approver_username',
            'decision_date',
            'approver_comments'
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'item_description', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['total_price']  # total_price is a @property on the model


class PurchaseOrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True)
    vendor_details = VendorSerializer(source='vendor', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id',
            'po_number', # This is now the generated PO-AA-NNNN ID
            'internal_office_memo',
            'vendor',
            'vendor_details',
            'order_date', 'expected_delivery_date',
            'total_amount', 'status',
            'created_by',
            'created_by_username',
            'created_at', 'updated_at',
            'shipping_address', 'notes',
            'order_items'
        ]
        read_only_fields = [
            'po_number', # Added po_number as it's system-generated
            'total_amount',
            'created_by',
            'created_by_username',
            'created_at',
            'updated_at'
        ]

    def create(self, validated_data):
        order_items_data = validated_data.pop('order_items')
        po = PurchaseOrder.objects.create(**validated_data)
        current_total_amount = 0
        for item_data in order_items_data:
            item = OrderItem.objects.create(purchase_order=po, **item_data)
            if item.unit_price is not None:
                current_total_amount += item.total_price
        po.total_amount = current_total_amount
        po.save(update_fields=['total_amount'])
        return po

    def update(self, instance, validated_data):
        order_items_data = validated_data.pop('order_items', None)
        instance = super().update(instance, validated_data)
        if order_items_data is not None:
            instance.order_items.all().delete()
            current_total_amount = 0
            for item_data in order_items_data:
                item = OrderItem.objects.create(purchase_order=instance, **item_data)
                if item.unit_price is not None:
                    current_total_amount += item.total_price
            instance.total_amount = current_total_amount
            instance.save(update_fields=['total_amount'])
        return instance


class CheckRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    approved_by_accounts_username = serializers.CharField(source='approved_by_accounts.username', read_only=True, allow_null=True)
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True, allow_null=True)

    # requested_by will be set by the view.
    requested_by = serializers.PrimaryKeyRelatedField(read_only=True)
    # purchase_order is a FK, will be writable by ID.
    # Other fields like approver, payment details are typically set by actions or specific user roles.

    class Meta:
        model = CheckRequest
        fields = [
            'id', 'cr_id', 'purchase_order', 'purchase_order_number', 'invoice_number', 'invoice_date',
            'amount', 'payee_name', 'payee_address', 'reason_for_payment',
            'requested_by', 'requested_by_username', 'request_date', 'status',
            'approved_by_accounts', 'approved_by_accounts_username',
            'accounts_approval_date', 'accounts_comments',
            'payment_method', 'payment_date', 'transaction_id', 'payment_notes'
        ]
        read_only_fields = [
            'cr_id', 'request_date',
            'status',  # Initial status set in perform_create, then by actions
            'requested_by_username',  # Derived
            'approved_by_accounts',  # Set by action
            'approved_by_accounts_username',  # Derived
            'accounts_approval_date',  # Set by action
            'accounts_comments',  # Set by action
            'purchase_order_number',  # Derived
            'payment_method',  # Set by action
            'payment_date',  # Set by action
            'transaction_id',  # Set by action
            'payment_notes'  # Set by action
        ]
        # Fields for creation by user:
        # purchase_order (optional ID), invoice_number, invoice_date, amount,
        # payee_name, payee_address, reason_for_payment.
        # `requested_by` set by view. `status` defaults in view.
        # Other fields are for subsequent workflow steps.
