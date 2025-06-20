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
    CheckRequestSerializer  # Added CheckRequestSerializer
)

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
        serializer.save(requested_by=self.request.user, status=PurchaseRequestMemo.STATUS_CHOICES[0][0])  # Default 'pending'

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Permissions
    def decide(self, request, pk=None):
        memo = self.get_object()
        decision = request.data.get('decision')
        comments = request.data.get('comments', '')
        if memo.status != PurchaseRequestMemo.STATUS_CHOICES[0][0]:  # 'pending'
            return Response({'error': 'This request is not pending a decision.'}, status=http_status.HTTP_400_BAD_REQUEST)
        valid_decisions = [PurchaseRequestMemo.STATUS_CHOICES[1][0], PurchaseRequestMemo.STATUS_CHOICES[2][0]]  # 'approved', 'rejected'
        if decision not in valid_decisions:
            return Response({'error': f"Invalid decision. Must be one of {valid_decisions}."}, status=http_status.HTTP_400_BAD_REQUEST)
        memo.status = decision
        memo.approver = request.user
        memo.decision_date = timezone.now()
        memo.approver_comments = comments
        memo.save()
        return Response(self.get_serializer(memo).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])  # TODO: Permissions
    def cancel(self, request, pk=None):
        memo = self.get_object()
        if not (memo.requested_by == request.user or request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'You do not have permission to cancel this request.'}, status=http_status.HTTP_403_FORBIDDEN)
        if memo.status != PurchaseRequestMemo.STATUS_CHOICES[0][0]:  # 'pending'
            return Response({'error': f"Only requests with status '{PurchaseRequestMemo.STATUS_CHOICES[0][1]}' can be cancelled."}, status=http_status.HTTP_400_BAD_REQUEST)
        memo.status = PurchaseRequestMemo.STATUS_CHOICES[4][0]  # 'cancelled'
        memo.save()
        return Response(self.get_serializer(memo).data)


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

    def _parse_order_items_json(self, request_data_mutable):
        import json
        order_items_json_str = request_data_mutable.pop('order_items_json', [None])[0]
        if order_items_json_str:
            try:
                order_items_data = json.loads(order_items_json_str)
                request_data_mutable['order_items'] = order_items_data
            except json.JSONDecodeError:
                # Consider raising a ValidationError or returning a 400 response
                # For now, we'll let it proceed and serializer might fail if order_items is missing/invalid
                pass # Or log an error
        return request_data_mutable

    def create(self, request, *args, **kwargs):
        mutable_data = request.data.copy() # Make data mutable

        # Handle file fields manually if they are part of the mutable_data
        # and need to be passed to the serializer correctly.
        # For 'attachments', DRF handles it if 'attachments' is in request.FILES.
        # If 'attachments' is also in request.data (e.g. as a string from somewhere),
        # ensure it's handled or removed to prevent conflicts.

        # If 'attachments' is part of request.data (e.g. filename string) and not a File object,
        # it might interfere. DRF expects File objects in request.FILES.
        # If sending filename as string in `data` and actual file in `request.FILES`
        # ensure your serializer or model handles this. Typically, just send the file.

        # If 'attachments' is expected as a file, it should be in request.FILES.
        # The serializer will pick it up. If it's also in mutable_data as something else,
        # it could cause issues. For now, let's assume standard DRF behavior.

        processed_data = self._parse_order_items_json(mutable_data)

        serializer = self.get_serializer(data=processed_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=http_status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        mutable_data = request.data.copy()

        processed_data = self._parse_order_items_json(mutable_data)

        serializer = self.get_serializer(instance, data=processed_data, partial=partial)
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
