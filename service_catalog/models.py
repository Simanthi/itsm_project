# service_catalog/models.py
from django.db import models
from django.utils.text import slugify

class CatalogCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Catalog Category"
        verbose_name_plural = "Catalog Categories"
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class CatalogItem(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.ForeignKey(CatalogCategory, related_name='items', on_delete=models.CASCADE)
    short_description = models.CharField(max_length=255, help_text="A brief summary of the service or item.")
    full_description = models.TextField(blank=True, null=True, help_text="Detailed description, potentially with HTML or Markdown.")
    # details_form_schema = models.JSONField(blank=True, null=True, help_text="JSON schema for dynamic form fields specific to this item.")
    estimated_fulfillment_time = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., '2-3 business days', '1 hour'")
    icon_url = models.URLField(blank=True, null=True, help_text="URL to an icon representing this item.")
    is_active = models.BooleanField(default=True, help_text="Whether this item is currently available in the catalog.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Catalog Item"
        verbose_name_plural = "Catalog Items"
        ordering = ['category', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.category.name})"
