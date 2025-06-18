from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import ServiceRequest
from core_api.email_utils import send_notification_email # Adjust import if necessary
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=ServiceRequest)
def send_service_request_assignment_notification(sender, instance, created, **kwargs):
    """
    Send a notification when a service request is assigned or re-assigned.
    """
    if instance.assigned_to and instance.assigned_to.email:
        subject = ""
        if created:
            subject = f"New Service Request Assigned to You: {instance.request_id} - {instance.title}"
        else:
            # Similar to incidents, this doesn't track if assigned_to specifically changed.
            subject = f"Service Request Updated & Assigned to You: {instance.request_id} - {instance.title}"

        message = (
            f"Dear {instance.assigned_to.first_name or instance.assigned_to.username},\n\n"
            f"A service request has been assigned to you or updated:\n\n"
            f"ID: {instance.request_id}\n"
            f"Title: {instance.title}\n"
            f"Description: {instance.description}\n"
            f"Category: {instance.get_category_display()}\n"
            f"Priority: {instance.get_priority_display()}\n"
            f"Status: {instance.get_status_display()}\n\n"
            f"Please review the service request details in the ITSM portal.\n\n"
            f"Thank you."
        )

        html_message = (
            f"<p>Dear {instance.assigned_to.first_name or instance.assigned_to.username},</p>"
            f"<p>A service request has been assigned to you or updated:</p>"
            f"<ul>"
            f"<li><b>ID:</b> {instance.request_id}</li>"
            f"<li><b>Title:</b> {instance.title}</li>"
            f"<li><b>Description:</b> {instance.description}</li>"
            f"<li><b>Category:</b> {instance.get_category_display()}</li>"
            f"<li><b>Priority:</b> {instance.get_priority_display()}</li>"
            f"<li><b>Status:</b> {instance.get_status_display()}</li>"
            f"</ul>"
            f"<p>Please review the service request details in the ITSM portal.</p>"
            f"<p>Thank you.</p>"
        )

        recipient_list = [instance.assigned_to.email]

        send_notification_email(subject, message, recipient_list, html_message=html_message)
    elif not instance.assigned_to:
        # Optional: Handle de-assignment notification
        pass
