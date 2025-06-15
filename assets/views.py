from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Asset
from .serializers import AssetSerializer
from service_requests.views import StandardResultsSetPagination # Import existing pagination

class AssetViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows assets to be viewed or edited.
    """
    queryset = Asset.objects.select_related('assigned_to').all().order_by('asset_tag')
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination # Use existing pagination
    # lookup_field = 'asset_tag' # Optional: if you want to use asset_tag for detail view lookups instead of pk/id
