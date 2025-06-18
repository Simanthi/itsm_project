from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Incident
# Adjust the import path according to where email_utils.py was created
from core_api.email_utils import send_notification_email
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Incident)
def send_incident_assignment_notification(sender, instance, created, **kwargs):
    """
    Send a notification when an incident is assigned or re-assigned.
    """
    # Check if 'assigned_to' field was changed or if it's a new assignment
    # This basic check doesn't perfectly detect if only 'assigned_to' changed on an update.
    # For more robust change detection, you might need to compare old and new values,
    # often done by storing the original state or using a library like django-simple-history.
    # For this initial implementation, we'll notify if 'assigned_to' is set.

    if instance.assigned_to and instance.assigned_to.email:
        # Determine if this is a new assignment or a change in assignment.
        # A simple way: if it's just created and assigned, it's new.
        # If updated, we need to know if assigned_to changed from a previous value.
        # This signal fires *after* save.

        # Let's assume we notify if assigned_to is present.
        # A more refined logic would check if this field specifically changed.
        # For now, this will notify on creation with assignment, and on any save where assigned_to is set.

        subject = ""
        if created:
            subject = f"New Incident Assigned to You: INC-{instance.id} - {instance.title}"
        else:
            # To check if assigned_to actually changed, we'd need the old value.
            # post_save doesn't give old values directly.
            # A common pattern is to fetch the object from DB before save in the view/serializer
            # or use a model field to track previous assignee if this specific notification is critical.
            # For simplicity, we'll send a generic update if it's not created.
            subject = f"Incident Updated & Assigned to You: INC-{instance.id} - {instance.title}"

        message = (
            f"Dear {instance.assigned_to.first_name or instance.assigned_to.username},\n\n"
            f"An incident has been assigned to you or updated:\n\n"
            f"ID: INC-{instance.id}\n"
            f"Title: {instance.title}\n"
            f"Description: {instance.description}\n"
            f"Priority: {instance.get_priority_display()}\n"  # Assumes get_FIELD_display() for choices
            f"Status: {instance.get_status_display()}\n\n"
            f"Please review the incident details in the ITSM portal.\n\n"
            f"Thank you."
        )

        # Construct a simple HTML message (optional)
        html_message = (
            f"<p>Dear {instance.assigned_to.first_name or instance.assigned_to.username},</p>"
            f"<p>An incident has been assigned to you or updated:</p>"
            f"<ul>"
            f"<li><b>ID:</b> INC-{instance.id}</li>"
            f"<li><b>Title:</b> {instance.title}</li>"
            f"<li><b>Description:</b> {instance.description}</li>"
            f"<li><b>Priority:</b> {instance.get_priority_display()}</li>"
            f"<li><b>Status:</b> {instance.get_status_display()}</li>"
            f"</ul>"
            f"<p>Please review the incident details in the ITSM portal.</p>"
            f"<p>Thank you.</p>"
        )

        recipient_list = [instance.assigned_to.email]

        send_notification_email(subject, message, recipient_list, html_message=html_message)
    elif not instance.assigned_to:
        # Optional: Handle de-assignment notification to previous assignee if needed
        pass
