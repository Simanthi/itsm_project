from django.apps import AppConfig


class ChangesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'changes'

    def ready(self):
        import changes.signals  # noqa F401: Import signals to connect them
