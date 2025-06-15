from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PurchaseRequestMemo

User = get_user_model()

class PurchaseRequestMemoSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    # approver can be null, so allow_null=True for its username field
    approver_username = serializers.CharField(source='approver.username', read_only=True, allow_null=True)

    # To allow setting requested_by via ID during creation if not handled by view (though view will handle it)
    # And to allow setting approver by ID if needed by an admin directly (though action is preferred)
    # We can make these fields writeable by default and they expect PKs.
    # However, requested_by is set in perform_create.
    # Approver is set by the 'decide' action.
    # So, for the main serializer, they can appear as their PKs for relation representation,
    # or we can make them read_only if we only want to rely on the custom logic.
    # Let's include them as is, default DRF behavior will show PK or nested if depth is set.
    # Since we have username fields for read, we can make the FK fields write_only or exclude for GETs if desired.
    # For now, let's keep them and rely on read_only_fields for control.

    # requested_by will be automatically set by the view using CurrentUserDefault or perform_create
    # We don't want requested_by to be settable via the serializer directly during creation by the user.
    # So, making it read_only=True here means it must be set programmatically (e.g. in perform_create).
    requested_by = serializers.PrimaryKeyRelatedField(read_only=True)


    class Meta:
        model = PurchaseRequestMemo
        fields = [
            'id', 'item_description', 'quantity', 'reason', 'estimated_cost',
            'requested_by', 'requested_by_username', 'request_date', 'status',
            'approver', 'approver_username', 'decision_date', 'approver_comments'
        ]
        read_only_fields = [
            'request_date',
            'status', # Initial status is 'pending', then managed by 'decide' action
            'approver', # Set by 'decide' action
            'approver_username', # Read-only as it's derived
            'decision_date', # Set by 'decide' action
            'approver_comments' # Set by 'decide' action or admin update
        ]
        # For creation, user provides: item_description, quantity, reason, estimated_cost.
        # requested_by is set by the view.
        # status defaults to 'pending'.
        # Other fields (approver, decision_date, approver_comments) are set via the 'decide' action.

        # If we want to allow an admin to update approver details directly via PUT/PATCH
        # then 'approver', 'decision_date', 'approver_comments', 'status' might not be in read_only_fields globally
        # but controlled by permissions or different serializers for actions.
        # For simplicity now, these are read-only for standard PUT/PATCH.
