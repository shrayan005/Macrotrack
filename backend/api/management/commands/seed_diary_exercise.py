"""
Management command: seed_diary_exercise
----------------------------------------
Seeds 42 days of synthetic DailyNote and ExerciseLog data for a given user.
Skips days that already have a note/exercise so it is safe to re-run.

Usage:
    python manage.py seed_diary_exercise --email user@example.com
    python manage.py seed_diary_exercise --email user@example.com --days 30
    python manage.py seed_diary_exercise --email user@example.com --clear
"""

import random
from datetime import date, timedelta

from django.core.management.base import BaseCommand, CommandError

from accounts.models import User
from api.diary.models import DailyNote
from api.exercise.models import ExerciseLog

TAGS_POOL = [
    ["Healthy eating"],
    ["Traveling"],
    ["Eating Out"],
    ["Meal Prepped"],
    ["Stressed"],
    ["Sick"],
    ["Cheat day"],
    ["Intermittent Fasting"],
    ["Healthy eating", "Meal Prepped"],
    ["Traveling", "Eating Out"],
    ["Stressed", "Cheat day"],
]

NOTE_TEXTS = [
    "Felt great today, stuck to my plan.",
    "Busy day, grabbed food on the go.",
    "Home cooked every meal today.",
    "Craving sweets but resisted most of them.",
    "Drank plenty of water, feeling good.",
    "Tired from work, ate a bit more than usual.",
    "Tried a new recipe for dinner.",
    "Skipped breakfast but had a solid lunch.",
    "Long meeting day — stress eating was real.",
    "Great energy levels throughout the day.",
    "Weekend cheat day, no regrets.",
    "Visited family, lots of home food.",
    "Feeling under the weather, light meals.",
    "Meal prepped for the whole week.",
    None,  # some days have no text
    None,
]

ACTIVITY_LEVELS = ['rest', 'light', 'moderate', 'moderate', 'active']  # weighted toward moderate

EXERCISES = [
    ("Running", 30, 300),
    ("Walking", 45, 180),
    ("Cycling", 40, 350),
    ("Swimming", 35, 280),
    ("HIIT Workout", 25, 320),
    ("Yoga", 50, 150),
    ("Weight Training", 45, 250),
    ("Jump Rope", 20, 220),
    ("Basketball", 60, 400),
    ("Badminton", 45, 260),
    ("Football", 60, 420),
    ("Stretching", 20, 80),
    ("Stair Climbing", 30, 200),
    ("Dance Workout", 35, 230),
    ("Home Workout", 30, 200),
]

EXERCISE_NOTES = [
    "Felt strong today.",
    "Good session.",
    "Pushed hard.",
    "Easy recovery run.",
    "New personal best!",
    "Struggled a bit but finished.",
    None,
    None,
]

class Command(BaseCommand):
    help = "Seed 42 days of synthetic DailyNote and ExerciseLog data for a user"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True, help="Email of the user to seed data for")
        parser.add_argument("--days", type=int, default=42, help="Number of past days to seed (default: 42)")
        parser.add_argument("--clear", action="store_true", help="Delete existing seeded data before inserting")

    def handle(self, *args, **options):
        email = options["email"]
        days = options["days"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise CommandError(f"No user found with email: {email}")

        today = date.today()

        if options["clear"]:
            dates = [today - timedelta(days=i) for i in range(1, days + 1)]
            deleted_notes = DailyNote.objects.filter(user=user, date__in=dates).delete()[0]
            deleted_ex = ExerciseLog.objects.filter(user=user, date__in=dates).delete()[0]
            self.stdout.write(f"Cleared {deleted_notes} notes and {deleted_ex} exercise logs.")

        notes_created = 0
        exercises_created = 0

        for i in range(1, days + 1):
            day = today - timedelta(days=i)

            # --- DailyNote (one per day, skip if exists) ---
            if not DailyNote.objects.filter(user=user, date=day).exists():
                DailyNote.objects.create(
                    user=user,
                    date=day,
                    tags=random.choice(TAGS_POOL),
                    note_text=random.choice(NOTE_TEXTS),
                    activity_level=random.choice(ACTIVITY_LEVELS),
                )
                notes_created += 1

            # --- ExerciseLog (0–2 sessions per day, skip if any exist) ---
            if not ExerciseLog.objects.filter(user=user, date=day).exists():
                # ~30% chance of rest day (no exercise)
                session_count = random.choices([0, 1, 2], weights=[30, 55, 15])[0]
                for _ in range(session_count):
                    name, base_duration, base_calories = random.choice(EXERCISES)
                    duration = base_duration + random.randint(-10, 10)
                    calories = base_calories + random.randint(-30, 30)
                    ExerciseLog.objects.create(
                        user=user,
                        date=day,
                        exercise_name=name,
                        duration_minutes=max(5, duration),
                        calories_burned=max(10, calories),
                        notes=random.choice(EXERCISE_NOTES),
                    )
                    exercises_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {notes_created} daily notes and {exercises_created} exercise logs "
            f"for {email} over the past {days} days."
        ))
