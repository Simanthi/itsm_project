# itsm_project/assets/admin.py
from django.contrib import admin
from .models import Asset, AssetCategory, Location, Vendor # Added Category, Location, Vendor
from simple_history.admin import SimpleHistoryAdmin # Added for model history


@admin.register(Asset)
class AssetAdmin(SimpleHistoryAdmin): # Changed from admin.ModelAdmin
    list_display = (
        "asset_tag",
        "name",
        "category",
        "status",
        "assigned_to",
        "location",
    )
    list_filter = ("category", "status", "location")
    search_fields = ("name", "asset_tag", "serial_number", "description")
    raw_id_fields = (
        "assigned_to",
    )  # Use a raw ID input for ForeignKeys to User for better performance
    date_hierarchy = "purchase_date"

# Register other models if not already registered (idempotent check)
if not admin.site.is_registered(AssetCategory):
    admin.site.register(AssetCategory)

if not admin.site.is_registered(Location):
    admin.site.register(Location)

if not admin.site.is_registered(Vendor):
    admin.site.register(Vendor)
