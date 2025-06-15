# itsm_project/changes/models.py
from django.db import models
from django.contrib.auth import get_user_model  # To reference your User model
from configs.models import ConfigurationItem  # Link to Configuration Items

User = get_user_model()


class ChangeRequest(models.Model):
    CHANGE_STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending_approval", "Pending Approval"),  # Links to workflows later
        ("approved", "Approved"),
        ("scheduled", "Scheduled"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
        ("reviewed", "Reviewed"),
    ]
    CHANGE_TYPE_CHOICES = [
        ("standard", "Standard Change"),
        ("normal", "Normal Change"),
        ("emergency", "Emergency Change"),
    ]
    IMPACT_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    title = models.CharField(max_length=255, help_text="Brief title of the change")
    description = models.TextField(
        help_text="Detailed description of the proposed change"
    )
    change_type = models.CharField(
        max_length=20, choices=CHANGE_TYPE_CHOICES, default="normal"
    )
    status = models.CharField(
        max_length=20, choices=CHANGE_STATUS_CHOICES, default="draft"
    )
    requested_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="submitted_changes"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_changes",
        help_text="Person responsible for implementing the change",
    )
    impact = models.CharField(
        max_length=20,
        choices=IMPACT_CHOICES,
        default="medium",
        help_text="Potential impact of the change",
    )
    justification = models.TextField(blank=True, help_text="Reason for the change")
    planned_start_date = models.DateTimeField(
        help_text="Planned start date and time of the change"
    )
    planned_end_date = models.DateTimeField(
        help_text="Planned end date and time of the change"
    )
    # Link to affected Configuration Items
    affected_cis = models.ManyToManyField(
        ConfigurationItem,
        blank=True,
        related_name="changes_affecting_cis",
        help_text="Configuration Items affected by this change",
    )
    # Link to related incidents if this change is a fix
    # related_incidents = models.ManyToManyField(
    #     'incidents.Incident', # Use string reference for forward declaration
    #     blank=True,
    #     related_name='related_changes',
    #     help_text="Incidents resolved or mitigated by this change"
    # )

    # Rollback plan if change fails
    rollback_plan = models.TextField(
        blank=True, help_text="Steps to revert the change if necessary"
    )
    implementation_notes = models.TextField(
        blank=True, null=True, help_text="Notes from the change implementation"
    )
    post_implementation_review = models.TextField(
        blank=True, null=True, help_text="Review of the change after completion"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Change Request"
        verbose_name_plural = "Change Requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"CR-{self.id}: {self.title}"
