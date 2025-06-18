# configs/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConfigurationItemViewSet

router = DefaultRouter()
router.register(r'items', ConfigurationItemViewSet, basename='configurationitem')
# Note: 'items' is used here for CIs. If categories for CIs were a model, they'd be separate.

urlpatterns = [
    path('', include(router.urls)),
]
