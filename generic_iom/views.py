from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated # IsAdminUser is used by IsTemplateAdmin
from django.utils import timezone
from django.db.models import Q
from rest_framework import serializers
from rest_framework.filters import SearchFilter, OrderingFilter # Import SearchFilter
# from django.db import transaction # Not explicitly used here yet

from .models import IOMCategory, IOMTemplate, GenericIOM
from .serializers import (
    IOMCategorySerializer,
    IOMTemplateSerializer,
    GenericIOMSerializer,
    GenericIOMSimpleActionSerializer,
    GenericIOMPublishSerializer
)
from .permissions import (
    IsTemplateAdmin,
    CanReadIOMTemplate,
    CanUseIOMTemplateForCreate,
    IsOwnerOrReadOnlyGenericIOM,
    CanPerformSimpleApproval,
    CanSubmitForSimpleApproval,
    CanPublishGenericIOM,
    CanViewGenericIOM
)

# For advanced workflow step listing (if added to this viewset)
# from django.contrib.contenttypes.models import ContentType
# try:
#     from procurement.models import ApprovalStep
#     from procurement.serializers import ApprovalStepSerializer # Assuming it's GFK-aware
# except ImportError:
#     ApprovalStep = None
#     ApprovalStepSerializer = None


class IOMCategoryViewSet(viewsets.ModelViewSet):
    queryset = IOMCategory.objects.all().order_by('name')
    serializer_class = IOMCategorySerializer
    permission_classes = [IsTemplateAdmin] # Only admins (staff) can manage categories

class IOMTemplateViewSet(viewsets.ModelViewSet):
    queryset = IOMTemplate.objects.all().order_by('category__name', 'name') # Show all, active filtering can be done by client or added here
    serializer_class = IOMTemplateSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [CanReadIOMTemplate()]
        return [IsTemplateAdmin()] # Create, update, delete only for admins

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            # Staff/admins see all templates, could be further filtered by is_active if desired for admin view
            return IOMTemplate.objects.all().order_by('category__name', 'name')

        # Non-staff users see active templates that are either public (no allowed_groups)
        # or are restricted to a group they are part of.
        user_groups = user.groups.all()
        return IOMTemplate.objects.filter(
            Q(is_active=True),
            Q(Q(allowed_groups__isnull=True) | Q(allowed_groups__in=user_groups))
        ).distinct().order_by('category__name', 'name')


class GenericIOMViewSet(viewsets.ModelViewSet):
    queryset = GenericIOM.objects.all().select_related(
        'iom_template__category', 'created_by',
        'parent_content_type', 'simple_approver_action_by'
    ).prefetch_related('to_users', 'to_groups').order_by('-created_at')
    serializer_class = GenericIOMSerializer
    filter_backends = [SearchFilter, OrderingFilter] # Add SearchFilter and OrderingFilter
    search_fields = [
        'gim_id',
        'subject',
        'created_by__username',
        'iom_template__name',
        'data_payload' # For basic text search within JSONField (behavior is DB dependent)
    ]
    ordering_fields = ['gim_id', 'subject', 'iom_template__name', 'status', 'created_by__username', 'created_at', 'published_at']

    def get_permissions(self):
        if self.action == 'create':
            return [CanUseIOMTemplateForCreate()]
        if self.action in ['update', 'partial_update']: # Edit
            return [IsOwnerOrReadOnlyGenericIOM()] # Checks owner of draft or staff
        if self.action == 'destroy': # Delete
            return [IsOwnerOrReadOnlyGenericIOM()] # Similar logic: owner of draft or staff
        if self.action == 'retrieve':
            return [CanViewGenericIOM()] # Custom view permission
        if self.action == 'submit_for_simple_approval':
            return [CanSubmitForSimpleApproval()]
        if self.action in ['simple_approve', 'simple_reject']:
            return [CanPerformSimpleApproval()]
        if self.action == 'publish':
            return [CanPublishGenericIOM()]
        # Default for list and other custom actions not specified
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return GenericIOM.objects.all().select_related(
                'iom_template__category', 'created_by',
                'parent_content_type', 'simple_approver_action_by'
            ).prefetch_related('to_users', 'to_groups').order_by('-created_at')

        # Non-staff users: see IOMs they created, are assigned to, or are in their groups, or published ones they can see
        # This can get complex. CanViewGenericIOM handles object-level, list needs broader query.
        # For simplicity now, let's allow users to list IOMs they created or are explicitly/group-wise recipients of.
        # The CanViewGenericIOM will further filter on retrieve.
        return GenericIOM.objects.filter(
            Q(created_by=user) |
            Q(to_users=user) |
            Q(to_groups__in=user.groups.all()) |
            Q(status='published') # Simplification: allow listing of all published, details filtered by CanViewGenericIOM
        ).distinct().select_related(
            'iom_template__category', 'created_by',
            'parent_content_type', 'simple_approver_action_by'
        ).prefetch_related('to_users', 'to_groups').order_by('-created_at')


    def perform_create(self, serializer):
        # Ensure the chosen template is active
        template = serializer.validated_data.get('iom_template')
        if not template.is_active:
            raise serializers.ValidationError("Cannot create IOM using an inactive template.")
            # This validation could also be in the serializer if template is part of validated_data there.
            # Here, it's after serializer.is_valid() so template is an instance.

        serializer.save(created_by=self.request.user, status='draft') # Default to draft

    def perform_update(self, serializer):
        # Additional logic for updates if needed, e.g. side effects of status changes.
        # The GenericIOM.save() method handles workflow trigger on status change to 'draft'.
        serializer.save()

    @action(detail=True, methods=['post'], serializer_class=GenericIOMSimpleActionSerializer)
    def submit_for_simple_approval(self, request, pk=None):
        iom = self.get_object() # get_object will apply object-level permissions

        # Additional state checks (already partially in permission, but good for explicit error)
        if iom.status != 'draft':
            return Response({'error': 'Only draft IOMs can be submitted for simple approval.'}, status=status.HTTP_400_BAD_REQUEST)
        if iom.iom_template.approval_type != 'simple':
            return Response({'error': 'This IOM is not configured for simple approval.'}, status=status.HTTP_400_BAD_REQUEST)

        iom.status = 'pending_approval'
        iom.save(update_fields=['status'])
        # TODO: Send notification to iom.iom_template.simple_approval_user / group members
        return Response(GenericIOMSerializer(iom, context={'request': request}).data)

    @action(detail=True, methods=['post'], serializer_class=GenericIOMSimpleActionSerializer)
    def simple_approve(self, request, pk=None):
        iom = self.get_object()
        if iom.status != 'pending_approval' or iom.iom_template.approval_type != 'simple':
             # Permission class should catch most, but explicit check is fine.
            return Response({'error': 'This IOM cannot be simple-approved at this stage or by you.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = GenericIOMSimpleActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        iom.status = 'approved'
        iom.simple_approver_action_by = request.user
        iom.simple_approval_action_at = timezone.now()
        iom.simple_approval_comments = serializer.validated_data.get('comments', '')
        iom.save(update_fields=['status', 'simple_approver_action_by', 'simple_approval_action_at', 'simple_approval_comments'])
        # TODO: Notify creator
        return Response(GenericIOMSerializer(iom, context={'request': request}).data)

    @action(detail=True, methods=['post'], serializer_class=GenericIOMSimpleActionSerializer)
    def simple_reject(self, request, pk=None):
        iom = self.get_object()
        if iom.status != 'pending_approval' or iom.iom_template.approval_type != 'simple':
            return Response({'error': 'This IOM cannot be simple-rejected at this stage or by you.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = GenericIOMSimpleActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data.get('comments', '')
        if not comments:
             return Response({'error': 'Comments are required for rejection.'}, status=status.HTTP_400_BAD_REQUEST)

        iom.status = 'rejected'
        iom.simple_approver_action_by = request.user
        iom.simple_approval_action_at = timezone.now()
        iom.simple_approval_comments = comments
        iom.save(update_fields=['status', 'simple_approver_action_by', 'simple_approval_action_at', 'simple_approval_comments'])
        # TODO: Notify creator
        return Response(GenericIOMSerializer(iom, context={'request': request}).data)

    @action(detail=True, methods=['post'], serializer_class=GenericIOMPublishSerializer)
    def publish(self, request, pk=None):
        iom = self.get_object() # Permission CanPublishGenericIOM applied

        # The permission class CanPublishGenericIOM already checks the state.
        # If we reach here, the user is authorized and IOM is in a publishable state.
        if iom.status == 'published':
            return Response({'message': 'IOM is already published.'}, status=status.HTTP_200_OK) # Or bad request?

        iom.status = 'published'
        # iom.published_at = timezone.now() # Model's save method also does this
        iom.save(update_fields=['status', 'published_at']) # Ensure published_at is updated if save method doesn't always
        # TODO: Send notifications to to_users/to_groups
        return Response(GenericIOMSerializer(iom, context={'request': request}).data)

    # Listing ApprovalSteps (advanced workflow) for a GenericIOM
    # This assumes ApprovalStepSerializer is GFK-aware and imported.
    # @action(detail=True, methods=['get'], url_path='advanced-approval-steps', permission_classes=[CanViewGenericIOM])
    # def advanced_approval_steps(self, request, pk=None):
    # ... (existing commented out code for advanced_approval_steps) ...

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrReadOnlyGenericIOM]) # Or a more specific "CanArchiveIOM"
    def archive(self, request, pk=None):
        iom = self.get_object()
        if iom.status == 'archived':
            return Response({'message': 'IOM is already archived.'}, status=status.HTTP_400_BAD_REQUEST)

        # Define which statuses can be archived. For example, published, rejected, cancelled.
        # Drafts might not make sense to archive directly, or they could go to 'cancelled' then 'archived'.
        archivable_statuses = ['published', 'rejected', 'cancelled', 'approved'] # 'approved' might also be archivable if not auto-published
        if iom.status not in archivable_statuses:
            return Response(
                {'error': f"IOMs with status '{iom.status}' cannot be directly archived. Consider cancelling or finalizing first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Optional: Store previous status if unarchive should revert to it.
        # if not hasattr(iom, '_previous_status_before_archive'): # Avoid overwriting if already set by another process
        #     iom._previous_status_before_archive = iom.status # Store it temporarily for a signal or further logic

        iom.status = 'archived'
        iom.save(update_fields=['status'])
        # TODO: Potentially log this action or send a notification to creator if archived by admin
        return Response(GenericIOMSerializer(iom, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[IsOwnerOrReadOnlyGenericIOM]) # Or "CanUnarchiveIOM"
    def unarchive(self, request, pk=None):
        iom = self.get_object()
        if iom.status != 'archived':
            return Response({'error': 'IOM is not currently archived.'}, status=status.HTTP_400_BAD_REQUEST)

        # Determine what status to revert to.
        # For simplicity, let's revert to 'draft'.
        # A more complex system might store the previous_status_before_archive.
        # For now, if it was published, perhaps it should go to 'published' again, or 'draft'.
        # Let's choose 'draft' as a safe default to allow re-review before re-publishing.
        previous_meaningful_status = 'draft'
        # if hasattr(iom, '_previous_status_before_archive') and iom._previous_status_before_archive:
        #    previous_meaningful_status = iom._previous_status_before_archive
        #    delattr(iom, '_previous_status_before_archive') # Clean up temporary attribute
        # elif iom.published_at: # If it was ever published, maybe revert to published?
        #    previous_meaningful_status = 'published'

        iom.status = previous_meaningful_status
        iom.save(update_fields=['status'])
        # TODO: Log or notify
        return Response(GenericIOMSerializer(iom, context={'request': request}).data)

    def get_queryset(self):
        user = self.request.user
        queryset = GenericIOM.objects.all().select_related(
            'iom_template__category', 'created_by',
            'parent_content_type', 'simple_approver_action_by'
        ).prefetch_related('to_users', 'to_groups') # Base queryset

        # Filter by status query param if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter == 'all_except_archived': # Special case for default view perhaps
                 queryset = queryset.exclude(status='archived')
            elif status_filter in [s[0] for s in GenericIOM.STATUS_CHOICES]:
                queryset = queryset.filter(status=status_filter)
            # else: ignore invalid status filter or return 400

        # Default filtering for non-staff: exclude archived unless explicitly requested by status filter
        if not user.is_staff and status_filter != 'archived':
             queryset = queryset.exclude(status='archived')


        # Apply existing visibility filters for non-staff
        if not user.is_staff:
            queryset = queryset.filter(
                Q(created_by=user) |
                Q(to_users=user) |
                Q(to_groups__in=user.groups.all()) |
                # If showing non-archived, published is fine. If specifically asking for archived, this OR might be too broad.
                # This published OR condition might need to be conditional based on status_filter
                (Q(status='published') if status_filter != 'archived' else Q())
            ).distinct()

        # Apply ordering (SearchFilter is already in filter_backends)
        # Default ordering is by -created_at from model Meta, OrderingFilter will respect that or override.
        return queryset.order_by('-created_at') # Ensure consistent default ordering
    #     iom = self.get_object()
    #     if iom.iom_template.approval_type != 'advanced':
    #         return Response({"detail": "Advanced approval not applicable for this IOM."}, status=status.HTTP_400_BAD_REQUEST)

    #     if not ApprovalStep or not ApprovalStepSerializer:
    #         return Response({"error": "Advanced approval system components not available."}, status=status.HTTP_501_NOT_IMPLEMENTED)

    #     content_type = ContentType.objects.get_for_model(iom)
    #     steps = ApprovalStep.objects.filter(content_type=content_type, object_id=iom.pk).order_by('step_order')

    #     page = self.paginate_queryset(steps)
    #     if page is not None:
    #         serializer = ApprovalStepSerializer(page, many=True, context={'request': request})
    #         return self.get_paginated_response(serializer.data)

    #     serializer = ApprovalStepSerializer(steps, many=True, context={'request': request})
    #     return Response(serializer.data)
