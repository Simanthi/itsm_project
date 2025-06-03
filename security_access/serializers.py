# itsm_project/security_access/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model


User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Include basic user info that might be displayed in dropdowns/lists
        fields = ['id', 'username', 'first_name', 'last_name', 'email']