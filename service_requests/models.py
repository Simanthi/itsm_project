# itsm_project/service_requests/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.db import transaction  # Import transaction for atomic operations

User = get_user_model()


# --- New Model for Sequence Generation ---
class ServiceRequestSequence(models.Model):
    """
    Model to store the current state of the ServiceRequest ID sequence.
    There should only ever be one instance of this model (pk=1).
    """

    current_alpha_part_char1 = models.CharField(
        max_length=1,
        default="A",
        help_text="First character of the alphanumeric part (e.g., 'A' for SR-AA-0001)",
    )
    current_alpha_part_char2 = models.CharField(
        max_length=1,
        default="A",
        help_text="Second character of the alphanumeric part (e.g., 'A' for SR-AA-0001)",
    )
    current_numeric_part = models.IntegerField(
        default=0, help_text="Current numeric value (0-9999)"
    )

    class Meta:
        verbose_name = "Service Request ID Sequence"
        verbose_name_plural = "Service Request ID Sequences"

    def __str__(self):
        return f"Current SR ID: {self.current_alpha_part_char1}{self.current_alpha_part_char2}-{self.current_numeric_part:04d}"

    @classmethod
    def get_next_sequence(cls):
        """
        Atomically increments and retrieves the next sequence for ServiceRequest IDs.
        Handles both numeric and alphanumeric parts.
        """
        with transaction.atomic():
            # Get or create the single instance, and then lock it for update
            seq_instance, created = cls.objects.select_for_update().get_or_create(
                pk=1,
                defaults={
                    "current_alpha_part_char1": "A",
                    "current_alpha_part_char2": "A",
                    "current_numeric_part": 0,
                },
            )

            # --- Retrieve current integer values first ---
            current_numeric = seq_instance.current_numeric_part
            current_char1_val = ord(seq_instance.current_alpha_part_char1) - ord("A")
            current_char2_val = ord(seq_instance.current_alpha_part_char2) - ord("A")

            # --- Perform logic on these integer values ---
            next_numeric = current_numeric + 1
            next_char1_val = current_char1_val
            next_char2_val = current_char2_val

            # Check if numeric part overflows (e.g., 9999 -> 10000)
            if next_numeric > 9999:  # If it's 10000 or more, reset and carry over
                next_numeric = 1  # Reset numeric part to 1

                # Increment alphanumeric part
                next_char2_val += 1
                if next_char2_val >= 26:  # 'Z' + 1
                    next_char2_val = 0  # Reset second char to 'A'
                    next_char1_val += 1  # Increment first char

                    if (
                        next_char1_val >= 26
                    ):  # 'Z' + 1 for first char (exhausted ZZ-9999)
                        # This means we've exhausted ZZ-9999. You need a strategy for this.
                        # For now, we'll raise an error. In a real system, you might log, alert, or
                        # implement a third character (AAA).
                        raise ValueError(
                            "Service Request ID sequence exhausted (ZZ-9999 reached). Please implement a larger sequence or reset."
                        )

            # --- Update the seq_instance fields with the calculated next values ---
            seq_instance.current_numeric_part = next_numeric
            seq_instance.current_alpha_part_char1 = chr(ord("A") + next_char1_val)
            seq_instance.current_alpha_part_char2 = chr(ord("A") + next_char2_val)

            seq_instance.save()  # Persist the updated sequence state to the database

            # Format the next ID based on the now-saved values
            alpha_part = f"{seq_instance.current_alpha_part_char1}{seq_instance.current_alpha_part_char2}"
            numeric_part = (
                f"{seq_instance.current_numeric_part:04d}"  # Pad with leading zeros
            )
            return f"SR-{alpha_part}-{numeric_part}"


# --- Update ServiceRequest Model ---
class ServiceRequest(models.Model):
    REQUEST_STATUS_CHOICES = [
        ("new", "New"),
        ("in_progress", "In Progress"),
        ("pending_approval", "Pending Approval"),  # Link to workflows later
        ("resolved", "Resolved"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    ]
    REQUEST_CATEGORY_CHOICES = [
        ("software", "Software Request"),
        ("hardware", "Hardware Request"),
        ("account", "Account Management"),
        ("network", "Network Access"),
        ("printer", "Printer Issue"),
        ("system", "Desktop/Laptop Issue"),
        ("information", "Information Request"),
        ("other", "Other"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    # New custom ID field
    request_id = models.CharField(
        max_length=15,
        unique=True,
        blank=True,
        help_text="Custom generated Service Request ID (e.g., SR-AA-0001)",
    )

    title = models.CharField(max_length=255, help_text="Summary of the service request")
    description = models.TextField(
        help_text="Detailed description of the service needed"
    )
    requested_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="submitted_service_requests"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_service_requests",
        help_text="IT staff assigned to fulfill this request",
    )
    status = models.CharField(
        max_length=20, choices=REQUEST_STATUS_CHOICES, default="new"
    )
    category = models.CharField(max_length=50, choices=REQUEST_CATEGORY_CHOICES)
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="medium"
    )
    resolution_notes = models.TextField(
        blank=True, null=True, help_text="Notes on how the request was fulfilled"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Service Request"
        verbose_name_plural = "Service Requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.request_id}: {self.title}"

    # Override the save method to generate the custom ID
    def save(self, *args, **kwargs):
        if (
            not self.request_id
        ):  # Only generate if request_id is not already set (for new instances)
            self.request_id = ServiceRequestSequence.get_next_sequence()
        super().save(*args, **kwargs)
