# itsm_project/incidents/models.py
from django.db import models
from django.contrib.auth import get_user_model  # To reference your User model
from django.utils import timezone # Add this import
from datetime import timedelta # Add this import
from simple_history.models import HistoricalRecords # Added for model history
from assets.models import Asset  # Link to assets
from configs.models import ConfigurationItem  # Link to configuration items

User = get_user_model()


class Incident(models.Model):
    INCIDENT_STATUS_CHOICES = [
        ("new", "New"),
        ("in_progress", "In Progress"),
        ("on_hold", "On Hold"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
        ("cancelled", "Cancelled"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]
    IMPACT_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]
    URGENCY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    title = models.CharField(max_length=255, help_text="Brief summary of the incident")
    description = models.TextField(help_text="Detailed description of the incident")
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reported_incidents",
        help_text="User who reported the incident",
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_incidents",
        help_text="IT staff assigned to resolve the incident",
    )
    status = models.CharField(
        max_length=20, choices=INCIDENT_STATUS_CHOICES, default="new"
    )
    priority = models.CharField(
        max_length=20, choices=PRIORITY_CHOICES, default="medium"
    )
    impact = models.CharField(
        max_length=20,
        choices=IMPACT_CHOICES,
        default="medium",
        help_text="Effect on business operations",
    )
    urgency = models.CharField(
        max_length=20,
        choices=URGENCY_CHOICES,
        default="medium",
        help_text="Speed at which incident needs to be resolved",
    )
    calculated_priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES, # Reuse existing choices
        default='medium', # Default, will be overridden
        blank=True, # Should be populated by logic
        help_text="Priority calculated based on impact and urgency"
    )
    sla_response_target_at = models.DateTimeField(
        null=True, blank=True, verbose_name="SLA Response Target"
    )
    sla_resolve_target_at = models.DateTimeField(
        null=True, blank=True, verbose_name="SLA Resolution Target"
    )

    # Optional links to related items
    related_asset = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents_affected",
        help_text="Primary asset affected by this incident",
    )
    related_ci = models.ForeignKey(
        ConfigurationItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents_affecting_ci",
        help_text="Primary Configuration Item affected by this incident",
    )

    resolution_notes = models.TextField(
        blank=True, null=True, help_text="Details on how the incident was resolved"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    history = HistoricalRecords()

    class Meta:
        verbose_name = "Incident"
        verbose_name_plural = "Incidents"
        ordering = ["-created_at"]

    def __str__(self):
        return f"INC-{self.id}: {self.title}"

    def _calculate_priority(self):
        # Define the matrix logic
        # Using existing PRIORITY_CHOICES: low, medium, high, critical
        if self.impact == 'high' and self.urgency == 'high':
            return 'critical'
        elif (self.impact == 'high' and self.urgency == 'medium') or \
             (self.impact == 'medium' and self.urgency == 'high'):
            return 'high'
        elif self.impact == 'high' and self.urgency == 'low':
            return 'medium'
        elif self.impact == 'medium' and self.urgency == 'medium':
            return 'medium'
        elif (self.impact == 'medium' and self.urgency == 'low') or \
             (self.impact == 'low' and self.urgency == 'high'):
            return 'medium'
        elif self.impact == 'low' and self.urgency == 'medium':
            return 'low'
        elif self.impact == 'low' and self.urgency == 'low':
            return 'low'
        return 'medium' # Default fallback if somehow not covered

    def save(self, *args, **kwargs):
        self.calculated_priority = self._calculate_priority()
        # Potentially make the old 'priority' field mirror this, or decide if it's fully replaced.
        # For now, let's assume 'priority' field will be manually set or deprecated.
        # If 'priority' is to be kept in sync: self.priority = self.calculated_priority

        # Example SLA rules (in hours)
        SLA_RULES = {
            # priority: (response_hours, resolution_hours)
            'critical': (1, 4),
            'high': (4, 24),
            'medium': (8, 72),
            'low': (24, 168),
        }

        # Calculate SLA targets
        # For simplicity, calculate if new or if calculated_priority is being updated (if passed in update_fields)
        # or if targets are not set yet.
        update_fields = kwargs.get('update_fields', None)
        is_new = self.pk is None
        priority_changed_in_update = update_fields and 'calculated_priority' in update_fields

        # Determine if SLA needs recalculation
        # Recalculate if:
        # 1. It's a new incident.
        # 2. Or, if calculated_priority is explicitly being updated (and thus might have changed).
        # 3. Or, if SLA fields are currently empty (e.g. for older records being saved after field addition).
        # This logic avoids resetting SLAs on every save if priority hasn't changed.

        recalculate_slas = False
        if is_new:
            recalculate_slas = True
        elif update_fields: # If specific fields are being updated
            if 'calculated_priority' in update_fields or 'impact' in update_fields or 'urgency' in update_fields:
                 # If priority or its determinants are updated, SLAs might need to change
                recalculate_slas = True
        elif not self.sla_response_target_at or not self.sla_resolve_target_at:
            # If not new, not specific update, but SLAs are missing, then calculate
            recalculate_slas = True


        if recalculate_slas:
            current_priority_for_sla = self.calculated_priority
            rules = SLA_RULES.get(current_priority_for_sla)

            if rules:
                base_time_for_sla = self.created_at if self.created_at else timezone.now()

                # Always set/reset response target if recalculating
                self.sla_response_target_at = base_time_for_sla + timedelta(hours=rules[0])

                # Always set/reset resolve target if recalculating
                self.sla_resolve_target_at = base_time_for_sla + timedelta(hours=rules[1])

        super().save(*args, **kwargs)


# You might add an IncidentUpdate model for logging chronological updates
class IncidentUpdate(models.Model):
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name="updates"
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="incident_updates"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    comment = models.TextField()
    new_status = models.CharField(
        max_length=20, choices=Incident.INCIDENT_STATUS_CHOICES, blank=True, null=True
    )
    new_priority = models.CharField(
        max_length=20, choices=Incident.PRIORITY_CHOICES, blank=True, null=True
    )

    class Meta:
        ordering = ["timestamp"]
        verbose_name = "Incident Update"
        verbose_name_plural = "Incident Updates"

    def __str__(self):
        return f"Update for INC-{self.incident.id} by {self.updated_by.username if self.updated_by else 'N/A'} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
