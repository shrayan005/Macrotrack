# FILE: api/management/commands/cleanup_history.py
# PURPOSE: Management command: prunes django-simple-history records older than N days.
"""
Management command: cleanup_history
-------------------------------------
Deletes simple-history audit records older than a configurable number of days.
Prevents the historical tables from growing unbounded in production.

Models covered: HistoricalUser, HistoricalFood, HistoricalMeal

Usage:
    python manage.py cleanup_history
    python manage.py cleanup_history --days 180
    python manage.py cleanup_history --dry-run

Schedule via cron (e.g. weekly on Sunday at 3am):
    0 3 * * 0 /path/to/venv/bin/python /path/to/manage.py cleanup_history
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

logger = logging.getLogger(__name__)

DEFAULT_RETENTION_DAYS = 365

class Command(BaseCommand):
    help = "Delete simple-history audit records older than N days"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=DEFAULT_RETENTION_DAYS,
            help=f"Retain records from the past N days (default: {DEFAULT_RETENTION_DAYS})",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview how many records would be deleted without making changes",
        )

    def handle(self, *args, **options):
        # Import here to avoid circular imports at module load time
        from accounts.models import User
        from api.models import Food, Meal

        days = options["days"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(days=days)

        targets = [
            ("HistoricalUser", User.history.model),
            ("HistoricalFood", Food.history.model),
            ("HistoricalMeal", Meal.history.model),
        ]

        total_deleted = 0

        for label, HistoricalModel in targets:
            qs = HistoricalModel.objects.filter(history_date__lt=cutoff)
            count = qs.count()

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f"DRY RUN: {label} — would delete {count} record(s) older than {days} days"
                    )
                )
            else:
                deleted, _ = qs.delete()
                total_deleted += deleted
                self.stdout.write(
                    self.style.SUCCESS(
                        f"{label}: deleted {deleted} record(s) older than {days} days"
                    )
                )
                logger.info("cleanup_history: deleted %d %s records", deleted, label)

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(f"Cleanup complete: {total_deleted} total historical records deleted.")
            )
            logger.info("cleanup_history: total deleted %d records", total_deleted)