from django.db.models.signals import post_save, pre_save # Import pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User, Group # Assuming User is from auth.User
from django.urls import reverse # For generating URLs to IOMs
from django.conf import settings # To get site domain for full URLs

from .models import GenericIOM
# Need to import ApprovalStep carefully due to potential circularity or app loading order
# from procurement.models import ApprovalStep # This might be problematic if procurement depends on generic_iom
# Instead, we can use sender=ApprovalStep in the receiver decorator if apps are loaded correctly.

# Assuming email utility exists
try:
    from core_api.email_utils import send_notification_email # Corrected function name
except ImportError:
    send_notification_email = None # Corrected variable name
    print("WARNING: core_api.email_utils.send_notification_email not found. Email notifications will be disabled.")

def get_user_emails(users_queryset):
    """Helper to get emails from a queryset of users, filtering out users without emails."""
    return list(users_queryset.filter(email__isnull=False, email__exact='').exclude(email='').values_list('email', flat=True))

def get_group_member_emails(group_instance):
    """Helper to get emails of all members in a group."""
    if group_instance:
        return get_user_emails(group_instance.user_set.all())
    return []

def get_absolute_url(path):
    # Use settings.SITE_URL or build it. For now, relative path.
    # This needs to be configured properly for emails to have clickable links.
    # Example: return f"{settings.SITE_DOMAIN}{path}"
    # For now, let's just return the path. Frontend will handle full URL.
    return path


@receiver(post_save, sender=GenericIOM)
def handle_generic_iom_saved(sender, instance: GenericIOM, created, **kwargs):
    if not send_notification_email: # Corrected check
        return # Email utility not available

    # Determine previous status if it's an update
    previous_status = None
    if not created and hasattr(instance, '_previous_status'): # Check if we attached it before saving
        previous_status = instance._previous_status

    # Notification 1: Submitted for Simple Approval
    if instance.status == 'pending_approval' and \
       (created or (previous_status and previous_status == 'draft')) and \
       instance.iom_template.approval_type == 'simple':

        recipients = []
        if instance.iom_template.simple_approval_user:
            if instance.iom_template.simple_approval_user.email:
                recipients.append(instance.iom_template.simple_approval_user.email)

        recipients.extend(get_group_member_emails(instance.iom_template.simple_approval_group))
        recipients = list(set(recipients)) # Unique emails

        if recipients:
            subject = f"IOM Submitted for Your Approval: {instance.subject} (ID: {instance.gim_id})"
            # TODO: Construct a proper URL to the IOM detail/approval page on the frontend
            iom_url = get_absolute_url(f"/ioms/view/{instance.id}") # Placeholder
            message = (
                f"Dear Approver,\n\n"
                f"The Internal Office Memo '{instance.subject}' (ID: {instance.gim_id}) created by {instance.created_by.username if instance.created_by else 'System'} "
                f"has been submitted for your approval.\n\n"
                f"Template: {instance.iom_template.name}\n"
                f"Please review and take action here: {iom_url}\n\n"
                f"Thank you."
            )
            send_notification_email(subject, message, settings.DEFAULT_FROM_EMAIL, recipients) # Corrected call

    # Notification 2: Simple Workflow Outcome (Approved/Rejected)
    if previous_status == 'pending_approval' and \
       instance.status in ['approved', 'rejected'] and \
       instance.iom_template.approval_type == 'simple' and \
       instance.created_by and instance.created_by.email:

        action_by_username = instance.simple_approver_action_by.username if instance.simple_approver_action_by else "System"
        outcome = instance.status.capitalize()
        subject = f"IOM '{instance.subject}' (ID: {instance.gim_id}) has been {outcome}"
        iom_url = get_absolute_url(f"/ioms/view/{instance.id}")
        message = (
            f"Dear {instance.created_by.username},\n\n"
            f"The IOM '{instance.subject}' (ID: {instance.gim_id}) has been {outcome} by {action_by_username}.\n"
        )
        if instance.simple_approval_comments:
            message += f"\nApprover Comments:\n{instance.simple_approval_comments}\n"
        message += f"\nYou can view the IOM here: {iom_url}\n\nThank you."
        send_notification_email(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.created_by.email]) # Corrected call

    # Notification 4: Advanced Workflow Final Outcome (Approved/Rejected)
    # This is also handled here, assuming the status change to 'approved'/'rejected'
    # for an 'advanced' template means the workflow is complete.
    if previous_status == 'pending_approval' and \
       instance.status in ['approved', 'rejected'] and \
       instance.iom_template.approval_type == 'advanced' and \
       instance.created_by and instance.created_by.email:

        # For advanced, the 'approver' field on GenericIOM might not be set for the final step actioner.
        # We might need to get the last actioner from ApprovalSteps if that detail is needed.
        # For now, just general notification.
        outcome = instance.status.capitalize()
        subject = f"IOM '{instance.subject}' (ID: {instance.gim_id}) - Advanced Workflow {outcome}"
        iom_url = get_absolute_url(f"/ioms/view/{instance.id}")
        message = (
            f"Dear {instance.created_by.username},\n\n"
            f"The IOM '{instance.subject}' (ID: {instance.gim_id}) submitted through the advanced workflow "
            f"has been finally {outcome}.\n"
            f"You can view the IOM here: {iom_url}\n\nThank you."
        )
        send_notification_email(subject, message, settings.DEFAULT_FROM_EMAIL, [instance.created_by.email]) # Corrected call


    # Notification 5: IOM Published
    if instance.status == 'published' and (created or (previous_status and previous_status != 'published')):
        recipients = []
        recipients.extend(get_user_emails(instance.to_users.all()))
        for group in instance.to_groups.all():
            recipients.extend(get_group_member_emails(group))
        recipients = list(set(recipients)) # Unique emails

        if recipients:
            subject = f"New IOM Published: {instance.subject} (ID: {instance.gim_id})"
            iom_url = get_absolute_url(f"/ioms/view/{instance.id}")
            # Consider adding a snippet of data_payload if safe and meaningful
            message = (
                f"Dear Colleagues,\n\n"
                f"A new Internal Office Memo has been published:\n"
                f"Title: {instance.subject}\n"
                f"ID: {instance.gim_id}\n"
                f"Template: {instance.iom_template.name}\n"
                f"Published by: {instance.created_by.username if instance.created_by else 'System'}\n\n"
                f"You can view the IOM here: {iom_url}\n\n"
                f"Thank you."
            )
            send_notification_email(subject, message, settings.DEFAULT_FROM_EMAIL, recipients) # Corrected call

# To get previous status for GenericIOM
@receiver(pre_save, sender=GenericIOM) # Use imported pre_save
def store_previous_generic_iom_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._previous_status = GenericIOM.objects.get(pk=instance.pk).status
        except GenericIOM.DoesNotExist:
            instance._previous_status = None


# Receiver for ApprovalStep creation (Notification 3)
# This needs to be dynamically connected if ApprovalStep is in another app to avoid AppRegistryNotReady
# or ensure generic_iom app is loaded after procurement.
# For now, we'll try a direct connection. If it fails at startup, will move to apps.py.

# Deferring direct import of ApprovalStep to function scope or apps.py to handle potential AppNotReady issues.
# Renamed to _actual as it's connected in apps.py
def handle_approval_step_created_for_generic_iom_actual(sender, instance, created, **kwargs):
    if not send_notification_email: # Corrected check
        return

    # Check if this ApprovalStep is for a GenericIOM and if it's newly created and pending
    if created and instance.status == 'pending':
        # Need to get ContentType for GenericIOM to check instance.content_type
        # This import should be safe within the function if apps are loaded.
        from django.contrib.contenttypes.models import ContentType
        from .models import GenericIOM as GenericIOMModel # Use an alias to avoid confusion

        generic_iom_content_type = ContentType.objects.get_for_model(GenericIOMModel)

        if instance.content_type == generic_iom_content_type:
            # The instance.content_object should be a GenericIOM instance
            g_iom = instance.content_object
            if not isinstance(g_iom, GenericIOMModel):
                # Should not happen if content_type matches, but good to be safe
                return

            recipients = []
            if instance.assigned_approver_user and instance.assigned_approver_user.email:
                recipients.append(instance.assigned_approver_user.email)

            recipients.extend(get_group_member_emails(instance.assigned_approver_group))
            recipients = list(set(recipients))

            if recipients:
                subject = f"Action Required: Approval Step for IOM '{g_iom.subject}' (ID: {g_iom.gim_id})"
                # TODO: Construct a proper URL to the approval task/IOM detail page on the frontend
                iom_url = get_absolute_url(f"/ioms/view/{g_iom.id}") # Placeholder
                # Could also link to a specific "my approvals" page: get_absolute_url("/my-approvals")

                message = (
                    f"Dear Approver,\n\n"
                    f"A new approval step has been assigned to you (or your group) for the Internal Office Memo:\n"
                    f"Title: {g_iom.subject}\n"
                    f"ID: {g_iom.gim_id}\n"
                    f"Template: {g_iom.iom_template.name}\n"
                    f"Step Details: {instance.rule_name_snapshot or f'Step Order {instance.step_order}'}\n\n"
                    f"Please review and take action here: {iom_url}\n\n"
                    f"Thank you."
                )
                send_notification_email(subject, message, settings.DEFAULT_FROM_EMAIL, recipients) # Corrected call
