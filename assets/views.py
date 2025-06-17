from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Asset, AssetCategory, Location, Vendor
from .serializers import AssetSerializer, AssetCategorySerializer, LocationSerializer, VendorSerializer
from service_requests.views import StandardResultsSetPagination # Import existing pagination

class AssetViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows assets to be viewed or edited.
    """
    # Consider adding 'category', 'location', 'vendor' to select_related if using depth=1 and performance is key
    queryset = Asset.objects.select_related('assigned_to', 'category', 'location', 'vendor').all().order_by('asset_tag')
    serializer_class = AssetSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination # Use existing pagination
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'category', 'location', 'vendor', 'assigned_to']

class AssetCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows asset categories to be viewed or edited.
    """
    queryset = AssetCategory.objects.all().order_by('name')
    serializer_class = AssetCategorySerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

class LocationViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows locations to be viewed or edited.
    """
    queryset = Location.objects.all().order_by('name')
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

class VendorViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows vendors to be viewed or edited.
    """
    queryset = Vendor.objects.all().order_by('name')
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
