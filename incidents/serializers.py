from rest_framework import serializers
from .models import Incident, Asset, ConfigurationItem, User  # Assuming User is from django.contrib.auth.models


class IncidentSerializer(serializers.ModelSerializer):
    reported_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), allow_null=True, required=False)
    related_asset = serializers.PrimaryKeyRelatedField(queryset=Asset.objects.all(), allow_null=True, required=False)
    related_ci = serializers.PrimaryKeyRelatedField(queryset=ConfigurationItem.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Incident
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'resolved_at', 'closed_at')
