# FILE: macrotrack_api/wsgi.py
# PURPOSE: WSGI entrypoint for traditional synchronous servers (e.g. Gunicorn).
"""
WSGI config for macrotrack_api project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'macrotrack_api.settings')

application = get_wsgi_application()