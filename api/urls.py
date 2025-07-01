# itsm_project/api/urls.py
from django.urls import path
from . import views

app_name = "app_api"  # Define app_name for namespacing

urlpatterns = [
    path("hello/", views.HelloApiView.as_view(), name="hello_api"),
]
