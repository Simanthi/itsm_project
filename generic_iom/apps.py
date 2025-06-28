from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class GenericIomConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "generic_iom"
    verbose_name = _("Generic Internal Office Memos")

    def ready(self):
        import generic_iom.signals # Import signals to connect them

        # For connecting to ApprovalStep from another app, do it carefully
        try:
            from django.db.models.signals import post_save
            from procurement.models import ApprovalStep
            from .signals import handle_approval_step_created_for_generic_iom_actual
            # Rename the actual handler to avoid conflict if signals.py is re-imported by Django multiple times

            post_save.connect(handle_approval_step_created_for_generic_iom_actual, sender=ApprovalStep)
        except ImportError:
            # This might happen if procurement app is not installed or during certain management commands
            # where apps are not fully loaded.
            pass
        except Exception as e:
            # Catch any other exception during connection to prevent app startup failure
            print(f"Warning: Could not connect signal for ApprovalStep notifications in generic_iom: {e}")
