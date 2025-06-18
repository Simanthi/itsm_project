# itsm_project/itsm_core/urls.py
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views # Added for password reset
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Password Reset URLs (using django.contrib.auth.views)
    path('password_reset/', auth_views.PasswordResetView.as_view(template_name='password_reset_form.html'), name='password_reset'),
    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(template_name='password_reset_done.html'), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='password_reset_confirm.html'), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(template_name='password_reset_complete.html'), name='password_reset_complete'),

    path("admin/", admin.site.urls),
    # DRF authentication (optional for now, but good to have the path)
    path("api-auth/", include("rest_framework.urls")),
    # Core API endpoints for our ITSM apps
    # Include urls from the core_api app (for general endpoints like 'hello')
    path("api/", include("core_api.urls")),  # <--- ADD THIS LINE HERE
    # Include urls from the assets app
    path('api/assets/', include('assets.urls')),
    # Include urls from the service_requests app
    path("api/service-requests/", include("service_requests.urls")),
    # Include urls from the security_access app (for User API, etc.)
    path("api/security-access/", include("security_access.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path('api/procurement/', include('procurement.urls')),  # Added procurement URLs
    # You will add paths for other modules here as we develop them:
    path('api/incidents/', include('incidents.urls')),
    path('api/service-catalog/', include('service_catalog.urls')), # Added Service Catalog URLs
    path('api/changes/', include('changes.urls')), # Uncommented Changes URLs
    path('api/configs/', include('configs.urls')), # Uncommented Configs URLs
    path('api/workflows/', include('workflows.urls')), # Uncommented Workflows URLs
    # path('api/reports-analytics/', include('reports_analytics.urls')),
]
