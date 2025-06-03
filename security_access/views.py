# itsm_project/security_access/views.py
from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer
# from rest_framework import permissions # Uncomment this later for security

User = get_user_model()

class UserViewSet(viewsets.ReadOnlyModelViewSet): # Use ReadOnlyModelViewSet for user listing
    """
    A simple ViewSet for listing users.
    """
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    # permission_classes = [permissions.IsAuthenticated] # Uncomment later