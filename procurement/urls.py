from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import common_views # Import common_views

router = DefaultRouter()
# Main procurement views
router.register(r'memos', views.PurchaseRequestMemoViewSet, basename='purchaserequestmemo')
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'order-items', views.OrderItemViewSet, basename='orderitem') # Should this be nested or standalone?
router.register(r'check-requests', views.CheckRequestViewSet, basename='checkrequest')

# Common data views for dropdowns
router.register(r'departments', common_views.DepartmentViewSet, basename='department')
router.register(r'projects', common_views.ProjectViewSet, basename='project')
router.register(r'vendors', common_views.AssetVendorViewSet, basename='assetvendor') # For vendors from assets app
router.register(r'contracts', common_views.ContractViewSet, basename='contract')
router.register(r'gl-accounts', common_views.GLAccountViewSet, basename='glaccount')
router.register(r'expense-categories', common_views.ExpenseCategoryViewSet, basename='expensecategory')
router.register(r'recurring-payments', common_views.RecurringPaymentViewSet, basename='recurringpayment')


app_name = 'procurement'

urlpatterns = [
    path('', include(router.urls)),
]
