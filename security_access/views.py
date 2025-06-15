# itsm_project/security_access/views.py
from rest_framework import viewsets
from django.contrib.auth import get_user_model
from .serializers import UserSerializer  # Ensure you're importing your UserSerializer
from rest_framework.permissions import IsAuthenticated

User = get_user_model()


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer  # Ensure this is set to your UserSerializer
    permission_classes = [IsAuthenticated]
    # filter_backends = [DjangoFilterBackend] # If you have filters
    # filterset_fields = ['username'] # If you have filters
