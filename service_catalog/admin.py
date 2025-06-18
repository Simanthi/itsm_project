# service_catalog/admin.py
from django.contrib import admin
from .models import CatalogCategory, CatalogItem

@admin.register(CatalogCategory)
class CatalogCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'created_at')
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}

@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'slug', 'is_active', 'estimated_fulfillment_time')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'short_description', 'category__name')
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ('is_active',)
