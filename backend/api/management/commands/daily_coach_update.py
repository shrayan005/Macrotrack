# FILE: api/management/commands/daily_coach_update.py
# PURPOSE: Nightly management command — recalculates a simple weekly-average
#          TDEE for each user and nudges their calorie goal if needed.
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from api.models import Meal, WeightLog, UserCheckIn
from django.db.models import Avg, Sum

class Command(BaseCommand):
    help = 'Run daily automatic coach updates for all users'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Show what would be updated without saving')
        parser.add_argument('--user-id', type=int,
                            help='Update specific user only')
        parser.add_argument('--force', action='store_true',
                            help='Force update even if already updated today')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        user_id = options['user_id']
        force = options['force']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))

        users = User.objects.filter(id=user_id) if user_id else User.objects.filter(is_active=True)

        if user_id and not users.exists():
            self.stdout.write(self.style.ERROR(f'User {user_id} not found'))
            return

        total = users.count()
        updated = skipped = errors = 0

        self.stdout.write(f'Processing {total} user(s)...\n')

        for user in users:
            try:
                result = self.update_user(user, dry_run=dry_run, force=force)
                if result['updated']:
                    updated += 1
                    self.stdout.write(self.style.SUCCESS(f'✓ {user.username}: {result["message"]}'))
                else:
                    skipped += 1
                    self.stdout.write(self.style.WARNING(f'- {user.username}: {result["message"]}'))
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(f'✗ {user.username}: {e}'))

        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(f'Processed: {total}  Updated: {updated}  Skipped: {skipped}  Errors: {errors}')

    def update_user(self, user, dry_run=False, force=False):
        today = timezone.now().date()

        # Skip if already updated today
        if not force and UserCheckIn.objects.filter(user=user, date=today).exists():
            return {'updated': False, 'message': 'Already updated today'}

        # Require 14 days of weight data and 7 days of meal data
        since = today - timedelta(days=14)

        weight_avg_early = WeightLog.objects.filter(
            user=user, date__gte=since, date__lt=today - timedelta(days=7)
        ).aggregate(avg=Avg('weight'))['avg']

        weight_avg_recent = WeightLog.objects.filter(
            user=user, date__gte=today - timedelta(days=7), date__lte=today
        ).aggregate(avg=Avg('weight'))['avg']

        meal_data = Meal.objects.filter(
            user=user, date__gte=since, date__lte=today
        ).values('date').annotate(daily_cal=Sum('total_calories')).filter(daily_cal__isnull=False)

        if not weight_avg_early or not weight_avg_recent:
            return {'updated': False, 'message': 'Need 14 days of weight data'}

        if meal_data.count() < 7:
            return {'updated': False, 'message': f'Need 7 days of meal data ({meal_data.count()} logged)'}

        # Simple TDEE: energy balance over 14 days
        avg_calories = sum(d['daily_cal'] for d in meal_data) / meal_data.count()
        weight_change_kg = float(weight_avg_recent) - float(weight_avg_early)
        tdee = avg_calories - (weight_change_kg * 7700 / 14)

        current_target = user.calorie_goal or 2000
        difference = tdee - current_target

        # Only adjust if difference is meaningful (≥50 cal), cap at ±100
        if abs(difference) < 50:
            return {'updated': False, 'message': f'No adjustment needed (TDEE≈{tdee:.0f} cal)'}

        adjustment = max(-100, min(100, round(difference / 50) * 50))
        new_target = current_target + adjustment

        message = (
            f'Updated {current_target:.0f} → {new_target:.0f} cal '
            f'({adjustment:+.0f} cal, TDEE≈{tdee:.0f})'
        )

        if dry_run:
            return {'updated': True, 'message': f'[DRY RUN] {message}'}

        user.calorie_goal = new_target
        user.save()

        latest_weight = WeightLog.objects.filter(user=user).order_by('-date').first()
        UserCheckIn.objects.create(
            user=user,
            date=today,
            weight_at_checkin=latest_weight.weight if latest_weight else None,
            notes=f'Auto-update: {adjustment:+.0f} cal (TDEE≈{tdee:.0f})'
        )

        return {'updated': True, 'message': message}
