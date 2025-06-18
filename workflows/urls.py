# workflows/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApprovalRequestViewSet, ApprovalStepViewSet

router = DefaultRouter()
router.register(r'requests', ApprovalRequestViewSet, basename='approvalrequest')
router.register(r'steps', ApprovalStepViewSet, basename='approvalstep')

urlpatterns = [
    path('', include(router.urls)),
]
