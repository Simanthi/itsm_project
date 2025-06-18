# changes/views.py
from rest_framework import viewsets, permissions
from .models import ChangeRequest
from .serializers import ChangeRequestSerializer
# from service_requests.views import StandardResultsSetPagination # If you want to reuse pagination

class ChangeRequestViewSet(viewsets.ModelViewSet):
    queryset = ChangeRequest.objects.select_related(
        'requested_by', 'assigned_to'
    ).prefetch_related(
        'affected_cis',
        # 'related_incidents' # If re-enabled
    ).all().order_by('-created_at')
    serializer_class = ChangeRequestSerializer
    permission_classes = [permissions.IsAuthenticated] # Adjust as needed
    # pagination_class = StandardResultsSetPagination # Optional
    filterset_fields = ['change_type', 'status', 'impact', 'assigned_to', 'requested_by']

    def perform_create(self, serializer):
        # Automatically set 'requested_by' to the current user on creation
        if self.request.user.is_authenticated:
            serializer.save(requested_by=self.request.user)
        else:
            # Handle cases where user might not be authenticated, if applicable
            # Or rely on permission_classes to prevent this.
            serializer.save()
