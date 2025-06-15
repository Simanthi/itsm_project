from rest_framework import viewsets, status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import PurchaseRequestMemo
from .serializers import PurchaseRequestMemoSerializer

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
        # For example, if there's an 'approver_group' or a designated approver field on the memo itself (e.g. department head).
        # if not request.user.has_perm('procurement.can_approve_purchaserequestmemo'): # Example permission
        #     return Response({'error': 'You do not have permission to decide on this request.'}, status=http_status.HTTP_403_FORBIDDEN)

        decision = request.data.get('decision')
        comments = request.data.get('comments', '')

        # Validate current status
        if memo.status != PurchaseRequestMemo.STATUS_CHOICES[0][0]: # 'pending'
            return Response(
                {'error': 'This request is not pending a decision.'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        # Validate decision value
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

        # Permission check: only requester or staff can cancel
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
        # Optionally, you might want to record who cancelled it and when, if that's important.
        # For example, add a 'cancelled_by' and 'cancellation_date' field to the model.
        # memo.cancelled_by = request.user
        # memo.cancellation_date = timezone.now()
        memo.save()
        serializer = self.get_serializer(memo)
        return Response(serializer.data)

# Further considerations for a production system:
# 1. Permissions: Implement robust permission classes (e.g., IsOwnerOrReadOnly, IsApproverOrAdmin)
#    to control who can list, retrieve, update, delete, decide, or cancel requests.
#    - Requesters should only be able to update/delete their own *pending* requests.
#    - Only authorized approvers should be able to use the 'decide' action.
# 2. Notifications: Send email notifications to requesters/approvers upon status changes.
# 3. Audit Trails: Log all changes, especially decisions and cancellations.
# 4. Filtering: Add more sophisticated filtering to the list view (e.g., by status, date range, approver).
#    Django Filter (django-filter package) can be integrated for this.
# 5. Validation: Add more specific validation in serializers or actions (e.g., ensure estimated_cost is positive).
# 6. PO Creation Flow: The 'po_created' status implies a subsequent step. This might involve another model
#    (PurchaseOrder) and logic to create a PO from an approved memo.
# 7. Error Handling: More detailed error messages or specific error codes might be useful for the frontend.
# 8. Atomic Transactions: For the 'decide' action, if multiple related objects were being updated,
#    wrapping the logic in `transaction.atomic()` would be important. For this single model update, it's less critical.
