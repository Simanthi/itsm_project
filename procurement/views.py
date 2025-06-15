from rest_framework import viewsets, status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import PurchaseRequestMemo, PurchaseOrder, OrderItem
from .serializers import PurchaseRequestMemoSerializer, PurchaseOrderSerializer, OrderItemSerializer

User = get_user_model()

class PurchaseRequestMemoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Purchase Request Memos to be viewed or edited.
    Provides custom actions for decision-making and cancellation.
    """
    serializer_class = PurchaseRequestMemoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all the purchase requests
        for the currently authenticated user or all requests if the user is staff/superuser.
        """
        user = self.request.user
        if user.is_staff or user.is_superuser: # Or check for a specific 'approver' group/permission
            return PurchaseRequestMemo.objects.all().select_related('requested_by', 'approver').order_by('-request_date')
        return PurchaseRequestMemo.objects.filter(requested_by=user).select_related('requested_by', 'approver').order_by('-request_date')

    def perform_create(self, serializer):
        """
        Automatically set the requester to the current logged-in user.
        """
        serializer.save(requested_by=self.request.user, status=PurchaseRequestMemo.STATUS_CHOICES[0][0]) # Default status 'pending'

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated]) # TODO: Replace with IsApproverOrAdmin permission
    def decide(self, request, pk=None):
        """
        Custom action to approve or reject a purchase request memo.
        Expects {'decision': 'approved'/'rejected', 'comments': 'optional comments'} in request data.
        """
        memo = self.get_object()
        # Ensure request.user has permission to approve. This is a placeholder for real permission logic.
        # if not request.user.has_perm('procurement.can_approve_purchaserequestmemo'): # Example permission
        #     return Response({'error': 'You do not have permission to decide on this request.'}, status=http_status.HTTP_403_FORBIDDEN)

        decision = request.data.get('decision')
        comments = request.data.get('comments', '')

        if memo.status != PurchaseRequestMemo.STATUS_CHOICES[0][0]: # 'pending'
            return Response(
                {'error': 'This request is not pending a decision.'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        valid_decisions = [PurchaseRequestMemo.STATUS_CHOICES[1][0], PurchaseRequestMemo.STATUS_CHOICES[2][0]] # 'approved', 'rejected'
        if decision not in valid_decisions:
            return Response(
                {'error': f"Invalid decision. Must be one of {valid_decisions}."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        memo.status = decision
        memo.approver = request.user
        memo.decision_date = timezone.now()
        memo.approver_comments = comments
        memo.save()

        serializer = self.get_serializer(memo)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):
        """
        Allows the requester or an admin/staff to cancel a 'pending' purchase request.
        """
        memo = self.get_object()

        if not (memo.requested_by == request.user or request.user.is_staff or request.user.is_superuser):
             return Response(
                {'error': 'You do not have permission to cancel this request.'},
                status=http_status.HTTP_403_FORBIDDEN
            )

        if memo.status != PurchaseRequestMemo.STATUS_CHOICES[0][0]: # 'pending'
            return Response(
                {'error': f"Only requests with status '{PurchaseRequestMemo.STATUS_CHOICES[0][1]}' can be cancelled."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        memo.status = PurchaseRequestMemo.STATUS_CHOICES[4][0] # 'cancelled'
        memo.save()
        serializer = self.get_serializer(memo)
        return Response(serializer.data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Purchase Orders to be viewed or edited.
    Manages nested OrderItems.
    """
    queryset = PurchaseOrder.objects.all().select_related(
        'vendor', 'internal_office_memo', 'created_by'
    ).prefetch_related('order_items').order_by('-order_date')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated] # Adjust as needed

    def perform_create(self, serializer):
        """
        Automatically set the creator of the PO to the current logged-in user.
        The serializer's create method handles total_amount calculation.
        """
        # PO Number generation could happen here if not handled by model default or signal
        # Example: if not serializer.validated_data.get('po_number'):
        # serializer.validated_data['po_number'] = generate_po_number()
        serializer.save(created_by=self.request.user)

    # Add custom actions if needed (e.g., mark_as_sent, receive_items, etc.)


class OrderItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Order Items directly.
    Typically, OrderItems are managed via the nested PurchaseOrderSerializer,
    but this ViewSet can be used for specific admin tasks or direct item adjustments if necessary.
    """
    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated] # Adjust as needed
    # Consider filtering by purchase_order if accessed directly:
    # filter_backends = [DjangoFilterBackend]
    # filterset_fields = ['purchase_order']


# Further considerations for a production system:
# 1. Permissions: Implement robust permission classes (e.g., IsOwnerOrReadOnly, IsApproverOrAdmin)
#    to control who can list, retrieve, update, delete, decide, or cancel requests/orders.
# 2. Notifications: Send email notifications.
# 3. Audit Trails: Log all changes.
# 4. Filtering: Add more sophisticated filtering using django-filter.
# 5. Validation: More specific validation in serializers or actions.
# 6. PO Creation Flow: Further integration between IOM approval and PO creation.
# 7. Error Handling: More detailed error messages.
# 8. Atomic Transactions: Ensure atomicity for complex operations.
