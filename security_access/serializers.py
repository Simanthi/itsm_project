# itsm_project/security_access/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # === CRUCIAL: Ensure 'id' is in this list ===
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = [
            "username",
            "is_staff",
            "is_active",
            "date_joined",
            "last_login",
        ]
