from rest_framework import serializers
from .models import Asset, User # Assuming User is from django.contrib.auth.models

class AssetSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
