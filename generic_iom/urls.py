from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.IOMCategoryViewSet, basename='iomcategory')
router.register(r'templates', views.IOMTemplateViewSet, basename='iomtemplate')
router.register(r'ioms', views.GenericIOMViewSet, basename='genericiom')

app_name = 'generic_iom'

urlpatterns = [
    path('', include(router.urls)),
]
