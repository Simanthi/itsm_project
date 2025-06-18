# service_catalog/views.py
from rest_framework import viewsets, permissions
from .models import CatalogCategory, CatalogItem
from .serializers import CatalogCategorySerializer, CatalogItemSerializer
# from service_requests.views import StandardResultsSetPagination # If you want to reuse pagination

class CatalogCategoryViewSet(viewsets.ReadOnlyModelViewSet): # ReadOnly for now
    queryset = CatalogCategory.objects.all()
    serializer_class = CatalogCategorySerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust as needed
    # pagination_class = StandardResultsSetPagination # Optional

class CatalogItemViewSet(viewsets.ReadOnlyModelViewSet): # ReadOnly for now, only active items
    queryset = CatalogItem.objects.filter(is_active=True)
    serializer_class = CatalogItemSerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust as needed
    # pagination_class = StandardResultsSetPagination # Optional
    filterset_fields = ['category', 'category__slug'] # Allow filtering by category ID or slug
