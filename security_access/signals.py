from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from core_api.email_utils import send_notification_email # Adjust import
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@receiver(post_save, sender=User)
def send_welcome_email(sender, instance, created, **kwargs):
    """
    Send a welcome email to a new user upon creation.
    """
    if created and instance.email:
        subject = "Welcome to the ITSM Portal!"
        message = (
            f"Dear {instance.first_name or instance.username},\n\n"
            f"Welcome to the ITSM Portal! Your account has been created.\n\n"
            f"Your username is: {instance.username}\n\n"
            f"You can access the portal here: [Link to Portal - TODO: Add actual link, perhaps from settings]\n\n" # Placeholder for portal link
            f"Thank you,\n"
            f"The ITSM Team"
        )
        html_message = (
            f"<p>Dear {instance.first_name or instance.username},</p>"
            f"<p>Welcome to the ITSM Portal! Your account has been created.</p>"
            f"<p>Your username is: <b>{instance.username}</b></p>"
            f"<p>You can access the portal here: <a href=\"#\">ITSM Portal</a></p>" # Placeholder
            f"<p>Thank you,<br/>The ITSM Team</p>"
        )

        recipient_list = [instance.email]
        send_notification_email(subject, message, recipient_list, html_message=html_message)
