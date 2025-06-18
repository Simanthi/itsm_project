# service_catalog/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CatalogCategoryViewSet, CatalogItemViewSet

router = DefaultRouter()
router.register(r'categories', CatalogCategoryViewSet, basename='catalogcategory')
router.register(r'items', CatalogItemViewSet, basename='catalogitem')

urlpatterns = [
    path('', include(router.urls)),
]
