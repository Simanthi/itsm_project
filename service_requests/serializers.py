# itsm_project/service_requests/serializers.py
from rest_framework import serializers
from .models import ServiceRequest
from security_access.serializers import UserSerializer  # Import the UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class ServiceRequestSerializer(serializers.ModelSerializer):
    # Nested serializer to show user details for requested_by and assigned_to
    requested_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)

    # Write-only fields to allow setting users by their IDs
    requested_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="requested_by", write_only=True
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assigned_to",
        write_only=True,
        required=False,
        allow_null=True,
    )
    catalog_item_name = serializers.CharField(source='catalog_item.name', read_only=True, allow_null=True)

    class Meta:
        model = ServiceRequest
        fields = [
            "id",
            "request_id",
            "title",
            "description",
            "requested_by",
            "requested_by_id",
            "assigned_to",
            "assigned_to_id",
            "status",
            "category",
            "priority",
            "catalog_item", # Added for writing catalog_item ID
            "catalog_item_name", # Added for reading catalog_item name
            "resolution_notes",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "request_id",
            "catalog_item_name", # Make name read-only
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        extra_kwargs = {
            'catalog_item': {'allow_null': True, 'required': False}
        }
