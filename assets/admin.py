# itsm_project/assets/admin.py
from django.contrib import admin
# Import all your models from models.py
from .models import Asset, AssetCategory, Location, Vendor


# Register the Asset model with its custom admin options
@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = (
        "asset_tag",
        "name",
        "category",
        "status",
        "assigned_to",
        "location",
        "vendor", # Added vendor to list_display as it's a ForeignKey
        "purchase_date",
        "warranty_end_date",
        "serial_number", # Included serial_number for quick view
        "created_at",    # Included created_at
        "updated_at",    # Included updated_at
    )
    list_filter = (
        "category",
        "status",
        "location",
        "vendor", # Added vendor to filter options
        "assigned_to", # Added assigned_to to filter
        "purchase_date", # Can filter by purchase date
    )
    search_fields = (
        "name",
        "asset_tag",
        "serial_number",
        "description",
        "assigned_to__username", # Allow searching by assigned user's username
        "category__name", # Allow searching by category name
        "location__name", # Allow searching by location name
        "vendor__name",   # Allow searching by vendor name
    )
    raw_id_fields = (
        "assigned_to",
        "category",
        "location",
        "vendor",
    )  # Use raw ID input for ForeignKeys for better performance with many entries
    date_hierarchy = "purchase_date"


# Register the AssetCategory model
@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')


# Register the Location model
@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'description')
    search_fields = ('name', 'description')


# Register the Vendor model
@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'contact_person',
        'email',
        'phone_number',
        'address'
    )
    search_fields = ('name', 'contact_person', 'email', 'phone_number', 'address')