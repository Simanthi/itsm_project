# service_catalog/apps.py
from django.apps import AppConfig

class ServiceCatalogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'service_catalog'
    verbose_name = "Service Catalog"
