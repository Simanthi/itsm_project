# itsm_project/api/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("hello/", views.HelloApiView.as_view(), name="hello_api"),
]
