# itsm_project/configs/admin.py
from django.contrib import admin
from .models import ConfigurationItem


@admin.register(ConfigurationItem)
class ConfigurationItemAdmin(admin.ModelAdmin):
    list_display = ("name", "ci_type", "status", "linked_asset", "criticality")
    list_filter = ("ci_type", "status", "criticality")
    search_fields = ("name", "description")
    raw_id_fields = ("linked_asset",)  # Link to Asset
    filter_horizontal = ("related_cis",)  # For ManyToMany fields
