# itsm_project/service_requests/urls.py
from rest_framework.routers import DefaultRouter
from .views import ServiceRequestViewSet

# Create a router and register our ViewSet with it.
router = DefaultRouter()
router.register(
    r"requests", ServiceRequestViewSet
)  # This will create URLs like /api/service-requests/requests/, /api/service-requests/requests/{id}/

# The API URLs are now determined automatically by the router.
urlpatterns = router.urls
