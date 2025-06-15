# itsm_project/security_access/admin.py
from django.contrib import admin
from .models import UserProfile
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import (
    User,
)  # Or your custom User model if you define it explicitly here


# If you need to embed UserProfile fields directly into the User admin
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "profile"


# Define a new User admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_it_staff_display",
    )

    def is_it_staff_display(self, obj):
        # Access the related UserProfile's is_it_staff field
        return obj.profile.is_it_staff if hasattr(obj, "profile") else False

    is_it_staff_display.short_description = "IT Staff"
    is_it_staff_display.boolean = True


# Re-register UserAdmin
# Check if User model is already registered. If so, unregister it first.
if admin.site.is_registered(User):
    admin.site.unregister(User)
admin.site.register(User, UserAdmin)

# You can also register UserProfile separately if you prefer, but embedding is often cleaner
# @admin.register(UserProfile)
# class UserProfileAdmin(admin.ModelAdmin):
#     list_display = ('user', 'phone_number', 'department', 'is_it_staff')
#     search_fields = ('user__username', 'phone_number', 'department')
#     list_filter = ('is_it_staff', 'department')
#     raw_id_fields = ('user',)
