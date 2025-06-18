# workflows/serializers.py
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import ApprovalRequest, ApprovalStep, User # Assuming User is imported from models

class ContentObjectRelatedField(serializers.RelatedField):
    """
    A custom field to use for the `content_object` generic relationship.
    """
    def to_representation(self, value):
        # Customize how the content_object is represented.
        # For example, return a string representation or a dictionary.
        if hasattr(value, 'get_absolute_url'): # Example for models with URLs
            return {
                'id': value.pk,
                'type': ContentType.objects.get_for_model(value).model,
                'display': str(value),
                'url': value.get_absolute_url()
            }
        if hasattr(value, 'title'): # For ChangeRequest, Incident, etc.
             return {
                'id': value.pk,
                'type': ContentType.objects.get_for_model(value).model,
                'title': value.title
             }
        return {
            'id': value.pk,
            'type': ContentType.objects.get_for_model(value).model,
            'display': str(value)
        }

class ApprovalStepSerializer(serializers.ModelSerializer):
    approver_username = serializers.CharField(source='approver.username', read_only=True, allow_null=True)

    class Meta:
        model = ApprovalStep
        fields = ['id', 'approval_request', 'step_order', 'approver', 'approver_username', 'status', 'comments', 'approved_at']
        read_only_fields = ['approval_request'] # Usually set by the system
        extra_kwargs = {
            'approver': {'queryset': User.objects.all(), 'allow_null': True, 'required': False}
        }


class ApprovalRequestSerializer(serializers.ModelSerializer):
    initiated_by_username = serializers.CharField(source='initiated_by.username', read_only=True, allow_null=True)
    content_object_display = ContentObjectRelatedField(source='content_object', read_only=True)
    steps = ApprovalStepSerializer(many=True, read_only=True) # Display steps related to this request

    class Meta:
        model = ApprovalRequest
        fields = [
            'id', 'title', 'description',
            'content_type', 'object_id', 'content_object_display',
            'initiated_by', 'initiated_by_username',
            'current_status', 'steps',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['content_type', 'object_id', 'initiated_by', 'created_at', 'updated_at'] # System-set fields
        extra_kwargs = {
            'initiated_by': {'queryset': User.objects.all(), 'allow_null': True, 'required': False}
        }
