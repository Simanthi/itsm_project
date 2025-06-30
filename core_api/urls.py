# itsm_project/core_api/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'core_api'  # Added for namespacing

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'groups', views.GroupViewSet, basename='group')
# router.register(r'contenttypes', views.ContentTypeViewSet, basename='contenttype') # If ContentTypeViewSet was used instead of APIView

urlpatterns = [
    path("hello/", views.hello_world, name="hello_world"),
    path("contenttypes/get-id/", views.ContentTypeLookupView.as_view(), name="contenttype-get-id"),
    # The API URLs are now determined automatically by the router.
    path('', include(router.urls)),
]
