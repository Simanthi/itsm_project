# changes/serializers.py
from rest_framework import serializers
from .models import ChangeRequest, User
from configs.models import ConfigurationItem
# from incidents.models import Incident # If direct linking to incidents is re-enabled
from configs.serializers import ConfigurationItemSerializer # For read-only representation
# from incidents.serializers import IncidentSerializer # For read-only representation

class ChangeRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True, allow_null=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True, allow_null=True)

    # For read operations, show details of affected CIs
    affected_cis_details = ConfigurationItemSerializer(source='affected_cis', many=True, read_only=True)
    # For write operations, accept a list of IDs for affected_cis
    # affected_cis is already set up to be writable with PKs by default for ManyToMany

    # If related_incidents is re-enabled in the model:
    # related_incidents_details = IncidentSerializer(source='related_incidents', many=True, read_only=True)

    class Meta:
        model = ChangeRequest
        fields = [
            'id', 'title', 'description', 'change_type', 'status',
            'requested_by', 'requested_by_username',
            'assigned_to', 'assigned_to_username',
            'impact', 'justification',
            'planned_start_date', 'planned_end_date',
            'affected_cis', 'affected_cis_details',
            # 'related_incidents', # If re-enabled
            # 'related_incidents_details', # If re-enabled
            'rollback_plan', 'implementation_notes', 'post_implementation_review',
            'created_at', 'updated_at', 'completed_at'
        ]
        extra_kwargs = {
            'requested_by': {'queryset': User.objects.all(), 'allow_null': True, 'required': False}, # Usually set automatically
            'assigned_to': {'queryset': User.objects.all(), 'allow_null': True, 'required': False},
            'affected_cis': {'queryset': ConfigurationItem.objects.all(), 'allow_empty': True, 'required': False},
            # 'related_incidents': {'allow_empty': True, 'required': False}, # If re-enabled
        }
        # Note: For 'requested_by', it's common to set this automatically based on the logged-in user
        # in the ViewSet's perform_create method.
