# itsm_project/itsm_core/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # DRF authentication (optional for now, but good to have the path)
    path('api-auth/', include('rest_framework.urls')), 
    

    # Core API endpoints for our ITSM apps
    # Include urls from the core_api app (for general endpoints like 'hello')
    path('api/', include('core_api.urls')), # <--- ADD THIS LINE HERE
    # Include urls from the assets app
    # Include urls from the service_requests app
    path('api/service-requests/', include('service_requests.urls')),
    # Include urls from the security_access app (for User API, etc.)
    path('api/security-access/', include('security_access.urls')), 
    
    # You will add paths for other modules here as we develop them:
    # path('api/incidents/', include('incidents.urls')),
    # path('api/changes/', include('changes.urls')),
    # path('api/configs/', include('configs.urls')),
    # path('api/workflows/', include('workflows.urls')),
    # path('api/reports-analytics/', include('reports_analytics.urls')),
]