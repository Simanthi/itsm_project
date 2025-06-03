# itsm_project/assets/admin.py
from django.contrib import admin
from .models import Asset

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_tag', 'name', 'category', 'status', 'assigned_to', 'location')
    list_filter = ('category', 'status', 'location')
    search_fields = ('name', 'asset_tag', 'serial_number', 'description')
    raw_id_fields = ('assigned_to',) # Use a raw ID input for ForeignKeys to User for better performance
    date_hierarchy = 'purchase_date'