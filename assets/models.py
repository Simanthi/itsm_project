# itsm_project/assets/models.py
from django.db import models
from django.contrib.auth import get_user_model # To reference your User model

User = get_user_model() # Get the currently active User model

class Asset(models.Model):
    ASSET_STATUS_CHOICES = [
        ('in_use', 'In Use'),
        ('in_stock', 'In Stock'),
        ('maintenance', 'Under Maintenance'),
        ('retired', 'Retired'),
        ('disposed', 'Disposed'),
    ]
    ASSET_CATEGORY_CHOICES = [
        ('hardware', 'Hardware'),
        ('software', 'Software'),
        ('network', 'Network Device'),
        ('server', 'Server'),
        ('peripheral', 'Peripheral'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255, help_text="Name of the asset (e.g., Dell XPS 15)")
    asset_tag = models.CharField(max_length=100, unique=True, help_text="Unique identifier for the asset (e.g., ASSET-001)")
    serial_number = models.CharField(max_length=255, blank=True, null=True, help_text="Manufacturer's serial number")
    category = models.CharField(max_length=50, choices=ASSET_CATEGORY_CHOICES, default='hardware')
    status = models.CharField(max_length=20, choices=ASSET_STATUS_CHOICES, default='in_use')
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL, # If user is deleted, asset assignment is cleared
        null=True,
        blank=True,
        related_name='assigned_assets',
        help_text="User currently assigned to this asset"
    )
    location = models.CharField(max_length=255, blank=True, help_text="Physical location of the asset")
    purchase_date = models.DateField(null=True, blank=True)
    warranty_end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, help_text="Detailed description or specifications")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "IT Asset"
        verbose_name_plural = "IT Assets"
        ordering = ['asset_tag']

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"