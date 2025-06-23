from rest_framework import viewsets, status as http_status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import PurchaseRequestMemo, PurchaseOrder, OrderItem, CheckRequest  # Added CheckRequest
from .serializers import (
    PurchaseRequestMemoSerializer,
    PurchaseOrderSerializer,
    OrderItemSerializer,
    CheckRequestSerializer,
    ApprovalRuleSerializer, # New
    ApprovalStepSerializer  # New
)
from .models import ApprovalRule, ApprovalStep # New
from django.db.models import Q # For complex queries
from django.contrib.auth.models import Group # For group checks


User = get_user_model()


class PurchaseRequestMemoViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Purchase Request Memos to be viewed or edited.
    Provides custom actions for decision-making and cancellation.
    """
    serializer_class = PurchaseRequestMemoSerializer
    #permission_classes = [IsAuthenticated] # Default, will be overridden by actions or more specific perms

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action == 'list' or self.action == 'retrieve':
            # Anyone authenticated can view list or details
            permission_classes = [IsAuthenticated]
        elif self.action == 'create':
             # Anyone authenticated can create
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy', 'cancel']:
            # Only owner or staff can edit/delete/cancel
            # Note: 'cancel' is a custom action, 'destroy' is standard delete
            permission_classes = [IsAuthenticated, IsOwnerOrReadOnly] # IsOwnerOrReadOnly checks created_by/requested_by
        elif self.action == 'decide':
            permission_classes = [IsAuthenticated, CanApproveRejectIOM] # Specific permission for deciding
        else:
            permission_classes = [IsAuthenticated] # Default
        return [permission() for permission in permission_classes]


    def get_queryset(self):
        user = self.request.user
        # Enhanced prefetching/selection for new FK fields
        base_queryset = PurchaseRequestMemo.objects.all().select_related(
            'requested_by', 'approver', 'department', 'project', 'suggested_vendor'
        ).order_by('-request_date')

        if user.is_staff or user.is_superuser:
            return base_queryset
        return base_queryset.filter(requested_by=user)

    def perform_create(self, serializer):
        # department, project, suggested_vendor, etc. are passed in request data and handled by serializer
        # Default status is 'draft', the save() method of PurchaseRequestMemo will handle triggering the workflow.
        serializer.save(requested_by=self.request.user, status='draft')

    # @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated]) # TODO: Permissions / Re-evaluate this
    # def decide(self, request, pk=None):
    #     # This action needs to be re-thought. Decisions are now made on ApprovalSteps.
    #     # This might be used for a final overall approval/rejection by an admin, or removed.
    #     memo = self.get_object()
    #     decision = request.data.get('decision')
    #     comments = request.data.get('comments', '')
    #
    #     # For now, let's prevent direct decisions if in 'pending_approval'
    #     if memo.status == 'pending_approval':
    #         return Response({'error': 'This request is currently in an approval workflow. Actions should be on approval steps.'}, status=http_status.HTTP_400_BAD_REQUEST)
    #
    #     # Original logic for non-workflow states (e.g. if it was 'pending' and no workflow applied)
    #     # This part needs careful review based on how we want to handle IOMs that don't trigger a workflow.
    #     # Assuming 'pending' is no longer a valid state to directly decide on if workflow is active.
    #     # 'draft' status IOMs are not yet submitted for approval.
    #
    #     # if memo.status != PurchaseRequestMemo.STATUS_CHOICES[0][0]:  # 'pending'
    #     #     return Response({'error': 'This request is not pending a decision.'}, status=http_status.HTTP_400_BAD_REQUEST)
    #     # valid_decisions = [PurchaseRequestMemo.STATUS_CHOICES[1][0], PurchaseRequestMemo.STATUS_CHOICES[2][0]]  # 'approved', 'rejected'
    #     # if decision not in valid_decisions:
    #     #     return Response({'error': f"Invalid decision. Must be one of {valid_decisions}."}, status=http_status.HTTP_400_BAD_REQUEST)
    #     # memo.status = decision
    #     # memo.approver = request.user # This direct approver field might be deprecated or used differently
    #     # memo.decision_date = timezone.now()
    #     # memo.approver_comments = comments
    #     # memo.save()
    #     # return Response(self.get_serializer(memo).data)
    #     return Response({'message': 'Direct decide action is under review due to new approval workflow.'}, status=http_status.HTTP_501_NOT_IMPLEMENTED)


    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Permissions
    def cancel(self, request, pk=None):
        memo = self.get_object()
        if not (memo.requested_by == request.user or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'You do not have permission to cancel this request.'}, status=http_status.HTTP_403_FORBIDDEN)

        cancellable_statuses = ['draft', 'pending_approval']
        if memo.status not in cancellable_statuses:
            return Response({'error': f"Only requests with status {cancellable_statuses} can be cancelled. Current status: {memo.get_status_display()}"}, status=http_status.HTTP_400_BAD_REQUEST)

        # Also cancel any pending approval steps
        if memo.status == 'pending_approval':
            memo.approval_steps.filter(status='pending').update(status='skipped', comments='IOM Cancelled by user.')

        memo.status = 'cancelled' # This maps to PurchaseRequestMemo.STATUS_CHOICES[x][0] where x is the index for 'cancelled'
        memo.save(update_fields=['status'])
        return Response(self.get_serializer(memo).data)


class ApprovalRuleViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Approval Rules to be viewed or edited.
    Typically restricted to administrators.
    """
    queryset = ApprovalRule.objects.all().select_related(
        'approver_user', 'approver_group'
    ).prefetch_related(
        'departments', 'projects'
    )
    serializer_class = ApprovalRuleSerializer
    permission_classes = [IsAuthenticated] # TODO: Replace with IsAdminUser or a custom permission for managing workflow rules.

    # Add any custom logic or override methods if needed, e.g., for validation.


class ApprovalStepViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing and actioning (approving/rejecting) Approval Steps.

    Users can list steps assigned to them or their groups.
    Admins can see all steps.
    Provides 'approve' and 'reject' custom actions.
    """
    serializer_class = ApprovalStepSerializer
    permission_classes = [IsAuthenticated] # More specific permissions are handled within actions.

    def get_queryset(self):
        """
        Customize queryset based on user role.
        - Staff/Superusers: See all approval steps.
        - Regular users: See pending steps assigned to them directly or to their groups.
        """
        user = self.request.user
        # Users should see steps assigned to them or their groups.
        # Admins might see all.
        if user.is_staff or user.is_superuser:
            return ApprovalStep.objects.all().select_related(
                'purchase_request_memo', 'approval_rule',
                'assigned_approver_user', 'assigned_approver_group', 'approved_by'
            ).order_by('-created_at')

        user_groups = user.groups.all()
        return ApprovalStep.objects.filter(
            Q(assigned_approver_user=user) | Q(assigned_approver_group__in=user_groups),
            status='pending' # Typically users only care about pending steps for action
        ).select_related(
            'purchase_request_memo', 'approval_rule',
            'assigned_approver_user', 'assigned_approver_group', 'approved_by'
        ).order_by('purchase_request_memo__iom_id', 'step_order')

    def _can_action_step(self, user, step):
        """ Helper to check if a user can action a step. """
        if step.status != 'pending':
            return False, "This step is not pending action."

        is_assigned_user = step.assigned_approver_user == user
        is_in_assigned_group = False
        if step.assigned_approver_group:
            is_in_assigned_group = user.groups.filter(pk=step.assigned_approver_group.pk).exists()

        if not (is_assigned_user or is_in_assigned_group):
            return False, "You are not authorized to action this approval step."
        return True, ""

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Custom action to approve an ApprovalStep.
        - Checks if the user is authorized and the step is pending.
        - Updates step status to 'approved'.
        - If this completes all approvals for the IOM, updates IOM status to 'approved'.
        """
        step = self.get_object()
        user = request.user
        comments = request.data.get('comments', '')

        can_action, message = self._can_action_step(user, step)
        if not can_action:
            return Response({'error': message}, status=http_status.HTTP_403_FORBIDDEN)

        step.status = 'approved'
        step.approved_by = user
        step.decision_date = timezone.now()
        step.comments = comments
        step.save()

        # Check if this approval completes the IOM
        iom = step.purchase_request_memo
        pending_steps = iom.approval_steps.filter(status='pending').exists()
        rejected_steps = iom.approval_steps.filter(status='rejected').exists() # Should not happen if one rejection fails the IOM

        if not pending_steps and not rejected_steps:
            # All steps are now actioned (approved or skipped), and none are rejected.
            # Check if all required steps (non-skipped) are approved.
            all_required_approved = not iom.approval_steps.filter(status__in=['pending', 'rejected']).exclude(status='skipped').exists()

            if all_required_approved:
                 # Double check if all non-skipped steps are indeed 'approved'
                are_all_actually_approved = True
                for s in iom.approval_steps.exclude(status='skipped'):
                    if s.status != 'approved':
                        are_all_actually_approved = False
                        break
                if are_all_actually_approved:
                    iom.status = 'approved'
                    iom.approver = user # Who took the final approving action for the IOM
                    iom.decision_date = timezone.now()
                    iom.approver_comments = f"Final approval step by {user.username}. Step comments: {comments}"
                    iom.save(update_fields=['status', 'approver', 'decision_date', 'approver_comments'])

        return Response(self.get_serializer(step).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Custom action to reject an ApprovalStep.
        - Checks if the user is authorized and the step is pending.
        - Requires comments for rejection.
        - Updates step status to 'rejected'.
        - Updates the parent IOM status to 'rejected'.
        - Skips any other pending steps for the IOM.
        """
        step = self.get_object()
        user = request.user
        comments = request.data.get('comments', '')

        if not comments:
            return Response({'error': 'Comments are required for rejection.'}, status=http_status.HTTP_400_BAD_REQUEST)

        can_action, message = self._can_action_step(user, step)
        if not can_action:
            return Response({'error': message}, status=http_status.HTTP_403_FORBIDDEN)

        step.status = 'rejected'
        step.approved_by = user # User who actioned
        step.decision_date = timezone.now()
        step.comments = comments
        step.save()

        # Update IOM status to rejected
        iom = step.purchase_request_memo
        iom.status = 'rejected'
        iom.approver = user # User who rejected
        iom.decision_date = timezone.now()
        iom.approver_comments = f"Rejected by {user.username} at step '{step.rule_name_snapshot or step.step_order}'. Comments: {comments}"
        iom.save(update_fields=['status', 'approver', 'decision_date', 'approver_comments'])

        # Optionally, mark other pending steps for this IOM as 'skipped' or 'cancelled_due_to_rejection'
        iom.approval_steps.filter(status='pending').update(status='skipped', comments=f"IOM rejected at step {step.step_order}.")


        return Response(self.get_serializer(step).data)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Enhanced prefetching/selection for new FK fields
        return PurchaseOrder.objects.all().select_related(
            'vendor', 'internal_office_memo__department', 'internal_office_memo__project', # Example of deeper relation
            'created_by', 'related_contract'
        ).prefetch_related(
            'order_items__gl_account' # Prefetch GL account for order items
        ).order_by('-order_date')

    # _parse_order_items_json helper removed as logic moved to PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        # Data is passed directly to serializer, which now handles 'order_items_json'
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=http_status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        # Pass request to serializer context if it needs it (e.g. for created_by)
        # The PurchaseOrderSerializer.create now expects created_by to be in validated_data or set by view
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        # Data is passed directly to serializer
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        return Response(serializer.data)

    def perform_update(self, serializer):
        serializer.save()


class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    permission_classes = [IsAuthenticated] # Permissions might need to be more granular

    def get_queryset(self):
        # Filter by PO if a purchase_order_id is provided in query_params, for example
        queryset = OrderItem.objects.all().select_related('purchase_order', 'gl_account')
        purchase_order_id = self.request.query_params.get('purchase_order_id')
        if purchase_order_id:
            queryset = queryset.filter(purchase_order_id=purchase_order_id)
        return queryset


class CheckRequestViewSet(viewsets.ModelViewSet):
    serializer_class = CheckRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # TODO: Define specific 'account_staff' group or permission
        is_accounts_staff = user.is_staff  # Simplified: staff can see more

        # Enhanced prefetching/selection for new FK fields
        base_queryset = CheckRequest.objects.all().select_related(
            'purchase_order__vendor', 'requested_by', 'approved_by_accounts',
            'expense_category', 'recurring_payment'
        ).order_by('-request_date')

        if is_accounts_staff or user.is_superuser:
            return base_queryset
        return base_queryset.filter(requested_by=user)

    def perform_create(self, serializer):
        # expense_category, recurring_payment, etc. are passed in request data
        po = serializer.validated_data.get('purchase_order')
        payee_name = serializer.validated_data.get('payee_name')
        payee_address = serializer.validated_data.get('payee_address')

        if po and not payee_name and po.vendor:
            payee_name = po.vendor.name
        if po and not payee_address and po.vendor:
            payee_address = po.vendor.address  # Assuming Vendor model has an address field

        serializer.save(
            requested_by=self.request.user,
            status=CheckRequest.CHECK_REQUEST_STATUS_CHOICES[0][0],  # 'pending_submission'
            payee_name=payee_name,
            payee_address=payee_address
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Requester or Admin
    def submit_for_approval(self, request, pk=None):
        instance = self.get_object()
        if instance.status == CheckRequest.CHECK_REQUEST_STATUS_CHOICES[0][0]:  # 'pending_submission'
            if instance.requested_by != request.user and not request.user.is_staff:
                return Response({'error': 'Only the requester or staff can submit.'}, status=http_status.HTTP_403_FORBIDDEN)
            instance.status = CheckRequest.CHECK_REQUEST_STATUS_CHOICES[1][0]  # 'pending_approval'
            instance.save()
            return Response(self.get_serializer(instance).data)
        return Response({'error': 'Request not in correct state for submission.'}, status=http_status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Accounts Payable Role
    def accounts_approve(self, request, pk=None):
        instance = self.get_object()
        comments = request.data.get('comments', '')
        if instance.status == CheckRequest.CHECK_REQUEST_STATUS_CHOICES[1][0]:  # 'pending_approval'
            instance.status = CheckRequest.CHECK_REQUEST_STATUS_CHOICES[2][0]  # 'approved'
            instance.approved_by_accounts = request.user
            instance.accounts_approval_date = timezone.now()
            instance.accounts_comments = comments
            instance.save()
            return Response(self.get_serializer(instance).data)
        return Response({'error': 'Request not pending accounts approval.'}, status=http_status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Accounts Payable Role
    def accounts_reject(self, request, pk=None):
        instance = self.get_object()
        comments = request.data.get('comments', '')
        if not comments:
            return Response({'error': 'Comments are required for rejection.'}, status=http_status.HTTP_400_BAD_REQUEST)
        if instance.status == CheckRequest.CHECK_REQUEST_STATUS_CHOICES[1][0]:  # 'pending_approval'
            instance.status = CheckRequest.CHECK_REQUEST_STATUS_CHOICES[3][0]  # 'rejected'
            instance.approved_by_accounts = request.user  # Still log who made the decision
            instance.accounts_approval_date = timezone.now()
            instance.accounts_comments = comments
            instance.save()
            return Response(self.get_serializer(instance).data)
        return Response({'error': 'Request not pending accounts approval.'}, status=http_status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Accounts Payable Role
    def mark_payment_processing(self, request, pk=None):
        instance = self.get_object()
        if instance.status == CheckRequest.CHECK_REQUEST_STATUS_CHOICES[2][0]:  # 'approved'
            instance.status = CheckRequest.CHECK_REQUEST_STATUS_CHOICES[4][0]  # 'payment_processing'
            instance.save()
            return Response(self.get_serializer(instance).data)
        return Response({'error': 'Request not approved for payment.'}, status=http_status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Accounts Payable Role
    def confirm_payment(self, request, pk=None):
        instance = self.get_object()
        payment_method = request.data.get('payment_method')
        transaction_id = request.data.get('transaction_id')
        payment_notes = request.data.get('payment_notes', '')
        payment_date_str = request.data.get('payment_date', timezone.now().strftime('%Y-%m-%d'))

        if instance.status not in [CheckRequest.CHECK_REQUEST_STATUS_CHOICES[2][0], CheckRequest.CHECK_REQUEST_STATUS_CHOICES[4][0]]:  # 'approved', 'payment_processing'
            return Response({'error': 'Request not in a state for payment confirmation.'}, status=http_status.HTTP_400_BAD_REQUEST)
        if not payment_method or not transaction_id:
            return Response({'error': 'Payment method and transaction ID/check number are required.'}, status=http_status.HTTP_400_BAD_REQUEST)

        instance.status = CheckRequest.CHECK_REQUEST_STATUS_CHOICES[5][0]  # 'paid'
        instance.payment_method = payment_method
        instance.payment_date = payment_date_str
        instance.transaction_id = transaction_id
        instance.payment_notes = payment_notes
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Requester or Admin
    def cancel(self, request, pk=None):
        instance = self.get_object()
        allowed_cancel_statuses = [
            CheckRequest.CHECK_REQUEST_STATUS_CHOICES[0][0],  # 'pending_submission'
            CheckRequest.CHECK_REQUEST_STATUS_CHOICES[1][0],  # 'pending_approval'
        ]
        if not (instance.requested_by == request.user or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'You do not have permission to cancel this request.'}, status=http_status.HTTP_403_FORBIDDEN)
        if instance.status not in allowed_cancel_statuses:
            return Response({'error': f"Only requests with status like '{allowed_cancel_statuses[0]}' or '{allowed_cancel_statuses[1]}' can be cancelled."}, status=http_status.HTTP_400_BAD_REQUEST)

        instance.status = CheckRequest.CHECK_REQUEST_STATUS_CHOICES[6][0]  # 'cancelled'
        instance.save()
        return Response(self.get_serializer(instance).data)
