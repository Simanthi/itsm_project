# itsm_project/configs/models.py
from django.db import models
from assets.models import Asset # Link to assets

class ConfigurationItem(models.Model):
    CI_TYPE_CHOICES = [
        ('server', 'Server'),
        ('application', 'Application'),
        ('database', 'Database'),
        ('network_device', 'Network Device'),
        ('storage', 'Storage'),
        ('service', 'Business Service'), # Could link to service_requests in future
        ('environment', 'Environment'),
        ('other', 'Other'),
    ]
    CI_STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('deprecated', 'Deprecated'),
        ('maintenance', 'Under Maintenance'),
    ]

    name = models.CharField(max_length=255, unique=True, help_text="Name of the Configuration Item")
    ci_type = models.CharField(max_length=50, choices=CI_TYPE_CHOICES, default='server')
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=CI_STATUS_CHOICES, default='active')
    # Link to a physical Asset if this CI represents one (e.g., a server CI linked to a physical server asset)
    linked_asset = models.ForeignKey(
        Asset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='configuration_items',
        help_text="Optional link to a specific IT Asset"
    )
    # Relationships between CIs (e.g., Application A depends on Database B)
    # A self-referential ManyToMany field to represent complex dependencies
    related_cis = models.ManyToManyField(
        'self',
        symmetrical=False, # Relationships don't have to be reciprocal (A depends on B, B doesn't necessarily depend on A)
        blank=True,
        related_name='dependencies',
        help_text="Other CIs this CI depends on or relates to"
    )
    version = models.CharField(max_length=50, blank=True, help_text="Version of the CI (e.g., software version)")
    criticality = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuration Item"
        verbose_name_plural = "Configuration Items"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.ci_type})"