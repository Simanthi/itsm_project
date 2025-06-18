from django.apps import AppConfig


class SecurityAccessConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = 'security_access'

    def ready(self):
        import security_access.signals # noqa F401
