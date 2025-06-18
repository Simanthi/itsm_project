# itsm_core/settings.py

import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'a-very-unsafe-default-key-for-dev-only-!!!')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG_ENV = os.environ.get('DJANGO_DEBUG', 'True')
DEBUG = DEBUG_ENV.lower() in ['true', '1', 't']

# Now that DEBUG is set, re-check SECRET_KEY if it's the default in a non-DEBUG environment
if SECRET_KEY == 'a-very-unsafe-default-key-for-dev-only-!!!' and not DEBUG:
    raise ValueError("DJANGO_SECRET_KEY must be set in production when DEBUG is False!")

ALLOWED_HOSTS_ENV = os.environ.get('DJANGO_ALLOWED_HOSTS')
if DEBUG and not ALLOWED_HOSTS_ENV:
    ALLOWED_HOSTS = ['*']
elif ALLOWED_HOSTS_ENV:
    ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS_ENV.split(',')]
else:
    ALLOWED_HOSTS = []

# Ensure ALLOWED_HOSTS is properly set in production
if not DEBUG and not ALLOWED_HOSTS:
    raise ValueError("ALLOWED_HOSTS must be set in production!")

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "simple_history",
    "assets",
    "configs",
    "service_requests",
    "incidents",
    "changes",
    "security_access",
    "workflows",
    "reports_analytics",
    "api",
    "core_api",
    "procurement",
    'service_catalog.apps.ServiceCatalogConfig',
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "itsm_core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "itsm_core.wsgi.application"

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'itsm_db'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres_password'), # Changed default for clarity
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}
# Add checks for production database settings
if not DEBUG:
    if DATABASES['default']['NAME'] == 'itsm_db' or \
       DATABASES['default']['USER'] == 'postgres' or \
       DATABASES['default']['PASSWORD'] == 'postgres_password':
        # This is a simple check. You might want to ensure these are *not* the defaults,
        # or that specific production env vars are present.
        print("WARNING: Default database credentials might be in use for production. Ensure DB_NAME, DB_USER, DB_PASSWORD are set via environment variables.")

# Email Configuration
EMAIL_BACKEND = os.environ.get('DJANGO_EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend') # Default to console for dev
EMAIL_HOST = os.environ.get('EMAIL_HOST')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587)) # Default to 587 for TLS
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ['true', '1', 't']
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'webmaster@localhost')
SERVER_EMAIL = os.environ.get('SERVER_EMAIL', DEFAULT_FROM_EMAIL) # For error reports to admins
ADMINS = [tuple(admin.split(':')) for admin in os.environ.get('DJANGO_ADMINS', '').split(',') if ':' in admin and os.environ.get('DJANGO_ADMINS')] # e.g., "Admin Name:admin@example.com,Other Admin:other@example.com"
MANAGERS = ADMINS

# Production check for email settings (if not using console backend)
if not DEBUG and EMAIL_BACKEND != 'django.core.mail.backends.console.EmailBackend':
    if not EMAIL_HOST or not EMAIL_HOST_USER or not DEFAULT_FROM_EMAIL:
        print("WARNING: Real email backend is configured, but EMAIL_HOST, EMAIL_HOST_USER, or DEFAULT_FROM_EMAIL may not be set. Emails might fail.")

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

APPEND_SLASH = False  # Ensures URLs are appended with a slash

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/
STATIC_URL = "static/"

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Replace with your React app's URL if different
    "http://127.0.0.1:5173",
]

# FIX: Add REST_FRAMEWORK settings for default pagination
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",  # Use JWT Authentication
        "rest_framework.authentication.SessionAuthentication",  # Optional, for browsable API
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",  # Now this permission will work
    ),
}
