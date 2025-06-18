# configs/serializers.py
from rest_framework import serializers
from .models import ConfigurationItem
from assets.models import Asset # For validating linked_asset
from assets.serializers import AssetSerializer # For read-only representation of linked_asset

class ConfigurationItemSerializer(serializers.ModelSerializer):
    # For read operations, show some details of the linked asset
    linked_asset_details = AssetSerializer(source='linked_asset', read_only=True)
    # For write operations, accept an ID for linked_asset
    linked_asset = serializers.PrimaryKeyRelatedField(
        queryset=Asset.objects.all(),
        allow_null=True,
        required=False,
        help_text="ID of the linked asset."
    )
    # For displaying related CIs (read-only, just IDs for now, could be expanded)
    related_cis_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        read_only=True,
        source='related_cis' # Source from the ManyToMany field
    )

    class Meta:
        model = ConfigurationItem
        fields = [
            'id', 'name', 'ci_type', 'description', 'status',
            'linked_asset', 'linked_asset_details',
            'related_cis', # This will be for writing list of IDs
            'related_cis_ids', # For reading list of IDs
            'version', 'criticality',
            'created_at', 'updated_at'
        ]
        # Make related_cis writeable with a list of IDs
        # By default, DRF handles ManyToMany as PrimaryKeyRelatedField for writing
        extra_kwargs = {
            'related_cis': {'allow_empty': True, 'required': False, 'queryset': ConfigurationItem.objects.all()}
        }
