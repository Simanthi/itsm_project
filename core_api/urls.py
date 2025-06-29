# itsm_project/core_api/urls.py

from django.urls import path
from . import views

app_name = 'core_api'  # Added for namespacing

urlpatterns = [
    path("hello/", views.hello_world, name="hello_world"),
    path("contenttypes/get-id/", views.ContentTypeLookupView.as_view(), name="contenttype-get-id"),
]
