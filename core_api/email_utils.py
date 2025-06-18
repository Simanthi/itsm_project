from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_notification_email(subject, message, recipient_list, html_message=None, fail_silently=False):
    """
    Sends a notification email.
    """
    if not recipient_list:
        logger.warning("Attempted to send email with no recipients.")
        return False

    # Ensure all recipients are strings
    valid_recipient_list = [str(recipient) for recipient in recipient_list if recipient]
    if not valid_recipient_list:
        logger.warning("No valid recipients after filtering.")
        return False

    try:
        send_mail(
            subject,
            message, # plain text message
            settings.DEFAULT_FROM_EMAIL,
            valid_recipient_list,
            html_message=html_message,
            fail_silently=fail_silently
        )
        logger.info(f"Email sent to {', '.join(valid_recipient_list)} with subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Error sending email to {', '.join(valid_recipient_list)} with subject {subject}: {e}", exc_info=True)
        if not fail_silently:
            raise  # Re-raise exception if not failing silently
        return False
