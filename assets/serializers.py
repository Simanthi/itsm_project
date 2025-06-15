from rest_framework import serializers
from .models import Asset, User, AssetCategory, Location, Vendor

class AssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetCategory
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'

class AssetSerializer(serializers.ModelSerializer):
    # assigned_to is already handled well for writes.
    # depth = 1 will handle its read representation.
    # For category, location, vendor, PrimaryKeyRelatedField could be used for explicit write control,
    # but DRF default behavior with depth=1 for reads and PKs for writes on related fields is often sufficient.

    class Meta:
        model = Asset
        fields = [
            'id',
            'name',
            'asset_tag',
            'serial_number',
            'category', # Will be PK for write, nested for read due to depth=1
            'status',
            'assigned_to', # Will be PK for write, nested for read due to depth=1
            'location', # Will be PK for write, nested for read due to depth=1
            'vendor', # Will be PK for write, nested for read due to depth=1
            'purchase_date',
            'warranty_end_date',
            'description',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ('created_at', 'updated_at')
        depth = 1
