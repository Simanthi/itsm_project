# changes/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from .models import ChangeRequest
from workflows.models import ApprovalRequest, ApprovalStep # Ensure workflows.models exists

User = get_user_model()

@receiver(post_save, sender=ChangeRequest)
def create_approval_for_change_request(sender, instance, created, **kwargs):
    # Check if the status that requires approval is set and no approval request already exists
    if instance.status == 'pending_approval' and not ApprovalRequest.objects.filter(
        content_type=ContentType.objects.get_for_model(instance),
        object_id=instance.id
    ).exists():
        # Create the main ApprovalRequest
        # Ensure initiated_by is set, falling back to a superuser or a designated system user
        initiator = instance.requested_by
        if not initiator:
            # Fallback: Try to find the user who last modified the instance if available and not anonymous
            # This part is tricky with signals as request.user is not directly available.
            # For now, let's use a simpler fallback: the first superuser.
            # A better approach might be to pass the user explicitly if possible via save() or have a system user.
            initiator = User.objects.filter(is_superuser=True).order_by('id').first()
            if not initiator: # If still no initiator, this is a problem.
                 print(f"CRITICAL: Cannot determine initiator for Change Request CR-{instance.id}. Approval not created.")
                 return


        approval_request = ApprovalRequest.objects.create(
            title=f"Approval for Change Request: CR-{instance.id} - {instance.title}",
            description=f"Please review and approve/reject Change Request ID: CR-{instance.id}.",
            content_object=instance,
            initiated_by=initiator
        )

        # Create a simple, single approval step (can be expanded for multi-step)
        # Assign to a default approver (e.g., a specific user, a manager role, or the change requester's manager)
        # For simplicity, assign to the first superuser found if no other logic.
        # In a real system, this assignment would be more sophisticated (e.g., based on change type, impact, CI owner).
        default_approver = User.objects.filter(is_superuser=True).order_by('id').first()
        if default_approver:
            ApprovalStep.objects.create(
                approval_request=approval_request,
                step_order=1,
                approver=default_approver,
                status='pending'
            )
        else:
            # Handle case where no default approver is found (e.g., log, set approval to error)
            print(f"Warning: No default approver found for Change Request CR-{instance.id}. Approval request CRID_Approval_{approval_request.id} created without steps.")
            # approval_request.current_status = 'pending' # Or some error status like 'configuration_error'
            # approval_request.save()
            # Depending on policy, an approval request without steps might automatically be considered 'approved' or 'error'.
            # For now, it will remain 'pending' as per model default, but without steps, it can't progress via step approval.
            pass
