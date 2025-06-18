# changes/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChangeRequestViewSet

router = DefaultRouter()
router.register(r'requests', ChangeRequestViewSet, basename='changerequest')

urlpatterns = [
    path('', include(router.urls)),
]
