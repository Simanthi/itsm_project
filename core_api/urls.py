# itsm_project/core_api/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path("hello/", views.hello_world, name="hello_world"),
]
