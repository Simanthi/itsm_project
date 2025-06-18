# configs/views.py
from rest_framework import viewsets, permissions
from .models import ConfigurationItem
from .serializers import ConfigurationItemSerializer
# from service_requests.views import StandardResultsSetPagination # If you want to reuse pagination

class ConfigurationItemViewSet(viewsets.ModelViewSet):
    queryset = ConfigurationItem.objects.select_related('linked_asset', 'linked_asset__category', 'linked_asset__vendor').prefetch_related('related_cis').all()
    serializer_class = ConfigurationItemSerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust as needed
    # pagination_class = StandardResultsSetPagination # Optional
    filterset_fields = ['ci_type', 'status', 'criticality', 'linked_asset']
