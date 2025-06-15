# itsm_project/security_access/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

User = get_user_model()


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    is_it_staff = models.BooleanField(
        default=False, help_text="Designates if the user is an IT staff member."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return self.user.username


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        # Create a profile only if the user is newly created
        UserProfile.objects.create(user=instance)
    else:
        # For existing users, ensure the profile is saved if it exists
        try:
            instance.profile.save()  # This line saves the existing profile if it's implicitly updated
        except UserProfile.DoesNotExist:
            # If the user exists but somehow doesn't have a profile, create one
            UserProfile.objects.create(user=instance)
