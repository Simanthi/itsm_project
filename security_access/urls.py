# itsm_project/security_access/urls.py
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

router = DefaultRouter()
router.register(
    r"users", UserViewSet
)  # This will create URLs like /api/security-access/users/

urlpatterns = router.urls
