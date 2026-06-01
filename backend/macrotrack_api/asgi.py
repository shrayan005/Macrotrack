# FILE: macrotrack_api/asgi.py
# PURPOSE: ASGI entrypoint for async-capable servers (e.g. Daphne, Uvicorn).
"""
ASGI config for macrotrack_api project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'macrotrack_api.settings')

application = get_asgi_application()