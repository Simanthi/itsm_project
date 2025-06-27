# itsm_project/core_api/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path("hello/", views.hello_world, name="hello_world"),
    path("contenttypes/get-id/", views.ContentTypeLookupView.as_view(), name="contenttype-get-id"),
]
