# FILE: api/apps.py
# PURPOSE: Django AppConfig for the api app — sets default_auto_field.
from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        import api.signals