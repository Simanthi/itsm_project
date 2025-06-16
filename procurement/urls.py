from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'memos', views.PurchaseRequestMemoViewSet, basename='purchaserequestmemo')
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'order-items', views.OrderItemViewSet, basename='orderitem')
router.register(r'check-requests', views.CheckRequestViewSet, basename='checkrequest')

app_name = 'procurement'

urlpatterns = [
    path('', include(router.urls)),
]
