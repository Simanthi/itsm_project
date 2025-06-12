# service_requests/views.py

from rest_framework import viewsets
from .models import ServiceRequest
from .serializers import ServiceRequestSerializer
from rest_framework.pagination import PageNumberPagination # Import PageNumberPagination
from rest_framework.permissions import IsAuthenticated


# FIX: Define a custom pagination class for more control
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10 # Default page size for this viewset
    page_size_query_param = 'page_size' # Allows client to specify page_size using ?page_size=X
    max_page_size = 100 # Maximum page size a client can request

class ServiceRequestViewSet(viewsets.ModelViewSet):
    # FIX: Use select_related to optimize ForeignKey lookups
    # This reduces N+1 queries for 'requested_by' and 'assigned_to' users
    queryset = ServiceRequest.objects.select_related('requested_by', 'assigned_to').all().order_by('-created_at')
    serializer_class = ServiceRequestSerializer
    lookup_field = 'request_id' # Tell DRF to use 'request_id' for detail lookups
    permission_classes = [IsAuthenticated] # Ensure permissions are set


    # FIX: Apply the pagination class
    pagination_class = StandardResultsSetPagination
