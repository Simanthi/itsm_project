# service_catalog/serializers.py
from rest_framework import serializers
from .models import CatalogCategory, CatalogItem

class CatalogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogCategory
        fields = ['id', 'name', 'slug', 'description']

class CatalogItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    # If you want to include the full category object:
    # category = CatalogCategorySerializer(read_only=True)

    class Meta:
        model = CatalogItem
        fields = [
            'id', 'name', 'slug', 'category', 'category_name',
            'short_description', 'full_description',
            'estimated_fulfillment_time', 'icon_url', 'is_active'
        ]
        # Ensure 'category' is writeable by its ID but returns nested/name on read.
        # By default, PrimaryKeyRelatedField is used for writable FKs.
