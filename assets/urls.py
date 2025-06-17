from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views  # Import views to access all viewsets

router = DefaultRouter()
router.register(r'assets', views.AssetViewSet, basename='asset')
router.register(r'categories', views.AssetCategoryViewSet, basename='assetcategory')
router.register(r'locations', views.LocationViewSet, basename='assetlocation')
router.register(r'vendors', views.VendorViewSet, basename='assetvendor')

app_name = 'assets'  # Good practice for namespacing

urlpatterns = [
    path('', include(router.urls)),
]
