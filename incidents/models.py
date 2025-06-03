# itsm_project/incidents/models.py
from django.db import models
from django.contrib.auth import get_user_model # To reference your User model
from assets.models import Asset # Link to assets
from configs.models import ConfigurationItem # Link to configuration items

User = get_user_model()

class Incident(models.Model):
    INCIDENT_STATUS_CHOICES = [
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('on_hold', 'On Hold'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    IMPACT_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    URGENCY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    title = models.CharField(max_length=255, help_text="Brief summary of the incident")
    description = models.TextField(help_text="Detailed description of the incident")
    reported_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reported_incidents',
        help_text="User who reported the incident"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_incidents',
        help_text="IT staff assigned to resolve the incident"
    )
    status = models.CharField(max_length=20, choices=INCIDENT_STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    impact = models.CharField(max_length=20, choices=IMPACT_CHOICES, default='medium', help_text="Effect on business operations")
    urgency = models.CharField(max_length=20, choices=URGENCY_CHOICES, default='medium', help_text="Speed at which incident needs to be resolved")
    
    # Optional links to related items
    related_asset = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents_affected',
        help_text="Primary asset affected by this incident"
    )
    related_ci = models.ForeignKey(
        ConfigurationItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='incidents_affecting_ci',
        help_text="Primary Configuration Item affected by this incident"
    )
    
    resolution_notes = models.TextField(blank=True, null=True, help_text="Details on how the incident was resolved")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Incident"
        verbose_name_plural = "Incidents"
        ordering = ['-created_at']

    def __str__(self):
        return f"INC-{self.id}: {self.title}"

# You might add an IncidentUpdate model for logging chronological updates
class IncidentUpdate(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='updates')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='incident_updates')
    timestamp = models.DateTimeField(auto_now_add=True)
    comment = models.TextField()
    new_status = models.CharField(max_length=20, choices=Incident.INCIDENT_STATUS_CHOICES, blank=True, null=True)
    new_priority = models.CharField(max_length=20, choices=Incident.PRIORITY_CHOICES, blank=True, null=True)

    class Meta:
        ordering = ['timestamp']
        verbose_name = "Incident Update"
        verbose_name_plural = "Incident Updates"

    def __str__(self):
        return f"Update for INC-{self.incident.id} by {self.updated_by.username if self.updated_by else 'N/A'} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"