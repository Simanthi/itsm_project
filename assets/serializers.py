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
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=AssetCategory.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    location_id = serializers.PrimaryKeyRelatedField(
        queryset=Location.objects.all(), source='location', write_only=True, required=False, allow_null=True
    )
    vendor_id = serializers.PrimaryKeyRelatedField(
        queryset=Vendor.objects.all(), source='vendor', write_only=True, required=False, allow_null=True
    )
    assigned_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='assigned_to', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Asset
        fields = [
            'id', 'name', 'asset_tag', 'serial_number',
            'category', 'category_id',
            'status', 'assigned_to', 'assigned_to_id',
            'location', 'location_id',
            'vendor', 'vendor_id',
            'purchase_date', 'warranty_end_date', 'description',
            'created_at', 'updated_at'
        ]
        read_only_fields = ('created_at', 'updated_at')
        depth = 1
