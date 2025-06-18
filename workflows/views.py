# workflows/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone # For setting approved_at
from .models import ApprovalRequest, ApprovalStep
from .serializers import ApprovalRequestSerializer, ApprovalStepSerializer

User = get_user_model()

class ApprovalRequestViewSet(viewsets.ReadOnlyModelViewSet): # Mostly ReadOnly for now
    queryset = ApprovalRequest.objects.select_related('initiated_by', 'content_type').prefetch_related('steps', 'steps__approver').all().order_by('-created_at')
    serializer_class = ApprovalRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['current_status', 'content_type', 'object_id', 'initiated_by']

class ApprovalStepViewSet(viewsets.ModelViewSet): # Allow updating steps (approve/reject)
    queryset = ApprovalStep.objects.select_related('approval_request', 'approver').all().order_by('approval_request_id', 'step_order')
    serializer_class = ApprovalStepSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'approver', 'approval_request']

    def get_queryset(self):
        # Users should only see steps assigned to them, unless they are admins/managers
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return super().get_queryset()
        return super().get_queryset().filter(approver=user, status='pending') # Only pending steps for non-staff

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        step = self.get_object()
        if step.approver != request.user and not (request.user.is_staff or request.user.is_superuser): # Check permission
            return Response({'error': 'You are not authorized to approve this step.'}, status=status.HTTP_403_FORBIDDEN)
        if step.status != 'pending':
            return Response({'error': 'This step is not pending approval.'}, status=status.HTTP_400_BAD_REQUEST)

        step.status = 'approved'
        step.approved_at = timezone.now() # Set approval timestamp
        step.comments = request.data.get('comments', step.comments)
        step.save()

        self._check_and_update_parent_request_status(step.approval_request)
        return Response(self.get_serializer(step).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        step = self.get_object()
        if step.approver != request.user and not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'You are not authorized to reject this step.'}, status=status.HTTP_403_FORBIDDEN)
        if step.status != 'pending':
            return Response({'error': 'This step is not pending approval.'}, status=status.HTTP_400_BAD_REQUEST)

        step.status = 'rejected'
        step.comments = request.data.get('comments', step.comments)
        # approved_at remains null for rejection
        step.save()

        # Update parent ApprovalRequest status to 'rejected'
        approval_request = step.approval_request
        approval_request.current_status = 'rejected'
        approval_request.save()
        return Response(self.get_serializer(step).data)

    def _check_and_update_parent_request_status(self, approval_request):
        # If all steps are approved, mark parent request as approved
        # This is a simplified check; real workflows can be more complex

        # Ensure we are working with the latest state from the DB
        approval_request.refresh_from_db()

        all_steps = approval_request.steps.all().order_by('step_order')
        is_approved = True
        is_any_pending = False

        for s in all_steps:
            if s.status == 'rejected':
                approval_request.current_status = 'rejected'
                approval_request.save()
                return # A rejection overrides everything
            if s.status == 'pending':
                is_any_pending = True
                is_approved = False # Not all steps are acted upon yet
                break
            if s.status != 'approved': # Could be 'skipped' or other non-final positive statuses
                is_approved = False # Not fully approved if some steps are not 'approved'

        if not is_any_pending and is_approved: # No steps are pending, and all non-pending are approved
             approval_request.current_status = 'approved'
        elif not is_any_pending and not is_approved and approval_request.current_status != 'rejected':
            # This case might mean some steps were skipped, or a complex logic not handled here.
            # For now, if not rejected and not fully approved (and no pending), keep as 'pending' or current.
            # Or, if you have a 'partially_approved' or 'completed_with_exceptions' status, set it here.
            pass # Keeps current status if not clearly 'approved' or 'rejected'
        # If there are pending steps, the status remains 'pending' (or its current state unless a rejection occurred)

        approval_request.save()
