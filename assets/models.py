# itsm_project/assets/models.py
from django.db import models
from django.contrib.auth import get_user_model  # To reference your User model

User = get_user_model()  # Get the currently active User model


class AssetCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Asset Categories"

    def __str__(self):
        return self.name


class Location(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="e.g., Building A, 1st Floor, Server Room XYZ")
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Locations"

    def __str__(self):
        return self.name


class Vendor(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Vendors"

    def __str__(self):
        return self.name


class Asset(models.Model):
    ASSET_STATUS_CHOICES = [
        ("in_use", "In Use"),
        ("in_stock", "In Stock"),
        ("maintenance", "Under Maintenance"),
        ("retired", "Retired"),
        ("disposed", "Disposed"),
    ]
    # ASSET_CATEGORY_CHOICES removed

    name = models.CharField(
        max_length=255, help_text="Name of the asset (e.g., Dell XPS 15)"
    )
    asset_tag = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique identifier for the asset (e.g., ASSET-001)",
    )
    serial_number = models.CharField(
        max_length=255, blank=True, null=True, help_text="Manufacturer's serial number"
    )
    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets'
    )
    status = models.CharField(
        max_length=20, choices=ASSET_STATUS_CHOICES, default="in_use"
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,  # If user is deleted, asset assignment is cleared
        null=True,
        blank=True,
        related_name="assigned_assets",
        help_text="User currently assigned to this asset",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets'
    )
    vendor = models.ForeignKey(
        Vendor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets'
    )
    purchase_date = models.DateField(null=True, blank=True)
    warranty_end_date = models.DateField(null=True, blank=True)
    description = models.TextField(
        blank=True, help_text="Detailed description or specifications"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "IT Asset"
        verbose_name_plural = "IT Assets"
        ordering = ["asset_tag"]

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"
