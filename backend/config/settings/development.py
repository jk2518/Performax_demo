from .base import *

DEBUG = True
# Use lenient CORS in development if needed
CORS_ALLOW_ALL_ORIGINS = True
ALLOWED_HOSTS = ['*']
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000',
    'https://*.trycloudflare.com',
]

# Use SMTP email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
