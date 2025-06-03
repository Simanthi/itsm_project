# itsm_project/service_requests/views.py
from rest_framework import viewsets
from .models import ServiceRequest
from .serializers import ServiceRequestSerializer
# from rest_framework import permissions # Uncomment this later for security

class ServiceRequestViewSet(viewsets.ModelViewSet):
    """
    A ViewSet for viewing and editing ServiceRequest instances.
    Provides CRUD operations for Service Requests.
    """
    queryset = ServiceRequest.objects.all().order_by('-created_at')
    serializer_class = ServiceRequestSerializer
    # permission_classes = [permissions.IsAuthenticated] # Will add this in security phase

    lookup_field = 'request_id' # Tell DRF to use 'request_id' for detail lookups