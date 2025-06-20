from rest_framework import viewsets, permissions
from .models import Department, Project, Contract, GLAccount, ExpenseCategory, RecurringPayment
from assets.models import Vendor as AssetVendor # Correct import for the Vendor model used by procurement
from .serializers import (
    DepartmentSerializer, ProjectSerializer, ContractSerializer,
    GLAccountSerializer, ExpenseCategorySerializer, RecurringPaymentSerializer
)
# Use the existing VendorSerializer from assets if it's suitable for dropdowns,
# or create a specific VendorDropdownSerializer if a simpler one is needed.
from assets.serializers import VendorSerializer # Assuming this is good for dropdown (id, name)


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing Departments."""
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]

class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing Projects."""
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetVendorViewSet(viewsets.ReadOnlyModelViewSet): # Renamed to avoid conflict if local Vendor exists
    """API endpoint for listing Vendors (from Assets app)."""
    queryset = AssetVendor.objects.all()
    serializer_class = VendorSerializer # Use the main VendorSerializer from assets
    permission_classes = [permissions.IsAuthenticated]

class ContractViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing Contracts."""
    queryset = Contract.objects.all().select_related('vendor')
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]

class GLAccountViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing GL Accounts."""
    queryset = GLAccount.objects.all()
    serializer_class = GLAccountSerializer
    permission_classes = [permissions.IsAuthenticated]

class ExpenseCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing Expense Categories."""
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

class RecurringPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for listing Recurring Payments."""
    queryset = RecurringPayment.objects.all().select_related('vendor', 'gl_account', 'expense_category')
    serializer_class = RecurringPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
