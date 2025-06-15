from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Incident
from .serializers import IncidentSerializer
from service_requests.views import StandardResultsSetPagination # Import existing pagination

class IncidentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows incidents to be viewed or edited.
    """
    queryset = Incident.objects.select_related(
        'reported_by',
        'assigned_to',
        'related_asset',
        'related_ci'
    ).all().order_by('-created_at')
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination # Use existing pagination
    # lookup_field = 'id' # Default, but can be explicit. Or a custom ID if Incident model has one.
