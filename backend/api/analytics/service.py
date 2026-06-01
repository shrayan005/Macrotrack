# FILE: api/analytics/service.py
# PURPOSE: Business logic for analytics and reporting — weight stats,
#          progress tracking, and full nutrition reports.
#          Merges analytics_service.py (weight/progress) and
#          reports_service.py (detailed reporting) into one module.
# USED BY: api/analytics/views.py, api/weight/viewset.py
# KEY CLASSES:
#   AnalyticsService — weight stats, progress stats, daily totals
#   ReportsService   — full nutrition reports by time period
# SECTION 1: AnalyticsService
# (originally api/services/analytics_service.py)
"""
Analytics service layer for MacroTrack.

Handles weight statistics, progress tracking, and nutrition analytics.
Separates business logic from views for better testability and maintainability.
"""

from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Avg, Sum
from django.db.models.functions import Coalesce

# Import from sub-packages to avoid circular imports with api.models
from api.meals.models import Meal
from api.weight.models import WeightLog
from api.cache_utils import get_current_weight

class AnalyticsService:
    """
    Service class for analytics and statistics operations.

    All methods are scoped to the user passed at construction time.
    """

    def __init__(self, user):
        """
        Initialize the AnalyticsService.

        Args:
            user: User instance (required for all analytics operations)

        Raises:
            ValueError: If user is None
        """
        if not user:
            raise ValueError('User is required for AnalyticsService')
        self.user = user

    def get_weight_stats(self, days=None):
        """
        Calculate weight statistics for the user.

        Args:
            days: Number of days to analyze (optional, analyzes all logs if not specified)

        Returns:
            dict: Weight statistics including current, starting, goal, changes, rates, and trends
        """
        # Fetch all weight logs ordered oldest-first for trend calculations
        logs = WeightLog.objects.filter(user=self.user).order_by('date')

        if not logs.exists():
            return {
                'error': 'No weight logs found',
                'current_weight': float(self.user.weight) if self.user.weight else None,
                'goal_weight': float(self.user.goal_weight) if self.user.goal_weight else None,
            }

        # Get basic weights from first and last log
        latest_log = logs.last()
        starting_log = logs.first()
        current_weight = latest_log.weight
        starting_weight = starting_log.weight
        goal_weight = self.user.goal_weight if self.user.goal_weight else current_weight

        # Calculate total change and remaining to goal
        total_change = float(current_weight) - float(starting_weight)
        remaining_to_goal = float(goal_weight) - float(current_weight)

        # Calculate 7-day moving average to smooth out daily fluctuations
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        recent_logs = logs.filter(date__gte=week_ago)
        moving_average_7day = recent_logs.aggregate(Avg('weight'))['weight__avg']

        # Calculate weekly rate of change by comparing last 7 days vs previous 7 days
        two_weeks_ago = today - timedelta(days=14)
        last_7_days = logs.filter(date__gte=week_ago, date__lte=today)
        previous_7_days = logs.filter(date__gte=two_weeks_ago, date__lt=week_ago)

        weekly_rate = 0.0
        trend = 'stable'

        if last_7_days.exists() and previous_7_days.exists():
            avg_last_week = last_7_days.aggregate(Avg('weight'))['weight__avg']
            avg_prev_week = previous_7_days.aggregate(Avg('weight'))['weight__avg']

            if avg_last_week and avg_prev_week:
                # Positive = gaining, negative = losing
                weekly_rate = float(avg_last_week) - float(avg_prev_week)

                # Classify trend (threshold: 0.1kg/week to filter noise)
                if weekly_rate < -0.1:
                    trend = 'losing'
                elif weekly_rate > 0.1:
                    trend = 'gaining'
                else:
                    trend = 'stable'

        return {
            'current_weight': float(current_weight),
            'starting_weight': float(starting_weight),
            'goal_weight': float(goal_weight),
            'total_change': round(total_change, 2),
            'remaining_to_goal': round(remaining_to_goal, 2),
            'weekly_rate': round(weekly_rate, 2),
            'trend': trend,
            'moving_average_7day': round(float(moving_average_7day), 2) if moving_average_7day else float(current_weight),
            'logs_count': logs.count(),
        }

    def get_progress_stats(self, days=30):
        """
        Calculate progress statistics for the specified number of days.

        Args:
            days: Number of days to analyze (default: 30)

        Returns:
            dict: Progress statistics including calorie adherence, macros, weight, streak
        """
        # Date range
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)

        # Get meals in date range with optimized prefetch (N+1 fix applied)
        meals = Meal.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).prefetch_related('meal_foods', 'meal_foods__food')

        # Get weight logs in date range
        weight_logs = WeightLog.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')

        # Calculate calorie stats
        total_meals = meals.count()
        days_logged = meals.values('date').distinct().count()

        calorie_target = self.user.calorie_target if self.user.calorie_target else 2000
        average_calories = 0
        adherence_percent = 0

        if total_meals > 0:
            # Calculate average calories per day
            daily_totals = meals.values('date').annotate(
                daily_calories=Sum('total_calories')
            )

            total_calories = sum([day['daily_calories'] for day in daily_totals if day['daily_calories']])
            average_calories = total_calories / len(daily_totals) if daily_totals else 0

            # Calculate adherence (days within ±5% of target)
            adherent_days = 0
            for day in daily_totals:
                if day['daily_calories']:
                    daily_cal = float(day['daily_calories'])
                    if abs(daily_cal - calorie_target) <= (calorie_target * 0.05):
                        adherent_days += 1

            adherence_percent = (adherent_days / len(daily_totals) * 100) if daily_totals else 0

        # Calculate macro averages
        macro_totals = meals.aggregate(
            avg_protein=Avg('total_protein'),
            avg_carbs=Avg('total_carbs'),
            avg_fat=Avg('total_fat'),
            avg_fiber=Avg('total_fiber'),
        )

        # Calculate weight change
        weight_change = 0.0
        weekly_rate = 0.0

        if weight_logs.count() >= 2:
            first_weight = weight_logs.first().weight
            last_weight = weight_logs.last().weight
            weight_change = float(last_weight) - float(first_weight)

            # Calculate weekly rate
            days_diff = (weight_logs.last().date - weight_logs.first().date).days
            if days_diff > 0:
                weekly_rate = (weight_change / days_diff) * 7

        # Calculate logging streak
        streak = 0
        if meals.exists():
            unique_dates = list(meals.values_list('date', flat=True).distinct().order_by('-date'))
            if unique_dates:
                current_date = unique_dates[0]
                today = datetime.now().date()

                if current_date >= today - timedelta(days=1):
                    streak = 1
                    for i in range(1, len(unique_dates)):
                        expected_date = current_date - timedelta(days=i)
                        if unique_dates[i] == expected_date:
                            streak += 1
                        else:
                            break

        return {
            'total_meals': total_meals,
            'days_logged': days_logged,
            'average_calories': round(average_calories, 1),
            'adherence_percent': round(adherence_percent, 1),
            'weight_change': round(weight_change, 2),
            'weekly_rate': round(weekly_rate, 2),
            'macro_averages': {
                'protein': round(float(macro_totals['avg_protein'] or 0), 1),
                'carbs': round(float(macro_totals['avg_carbs'] or 0), 1),
                'fat': round(float(macro_totals['avg_fat'] or 0), 1),
                'fiber': round(float(macro_totals['avg_fiber'] or 0), 1),
            },
            'streak': streak,
            'period_days': days,
        }

    def get_daily_totals(self, start_date, end_date):
        """
        Get daily nutrition totals for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            QuerySet: Daily totals with date and nutrition sums
        """
        zero = Decimal('0.00')
        return (
            Meal.objects
            .filter(user=self.user, date__gte=start_date, date__lte=end_date)
            .values('date')
            .annotate(
                daily_calories=Coalesce(Sum('total_calories'), zero),
                daily_protein=Coalesce(Sum('total_protein'), zero),
                daily_carbs=Coalesce(Sum('total_carbs'), zero),
                daily_fat=Coalesce(Sum('total_fat'), zero),
                daily_fiber=Coalesce(Sum('total_fiber'), zero),
            )
            .order_by('date')
        )

    def get_nutrition_summary(self, date):
        """
        Get nutrition summary for a specific date.

        Args:
            date: Date to get summary for

        Returns:
            dict: Nutrition totals for the date
        """
        from api.cache_utils import get_daily_nutrition
        return get_daily_nutrition(self.user, date)

# SECTION 2: ReportsService
# (originally api/reports_service.py)
import logging
from datetime import date, timedelta
from collections import defaultdict
from django.db.models import Sum, Avg, Count, F, Q

from api.diary.models import DailyNote
from api.foods.models import Food
from api.meals.models import MealFood

reports_logger = logging.getLogger(__name__)

class ReportsService:
    """
    Service for generating nutrition reports and analytics.

    Produces full reports covering summary stats, top foods, meal distribution,
    daily patterns, nutrition breakdown, and notes insights for a given period.
    """

    def __init__(self, user):
        """Initialize the ReportsService for a specific user."""
        self.user = user

    def get_date_range(self, period):
        """
        Parse period string and return start/end dates.

        Args:
            period: '7d', '30d', 'this_month', or 'custom:YYYY-MM-DD:YYYY-MM-DD'

        Returns:
            tuple: (start_date, end_date, period_label)
        """
        today = date.today()

        if period == '7d':
            start_date = today - timedelta(days=6)
            return start_date, today, 'Last 7 Days'

        elif period == '30d':
            start_date = today - timedelta(days=29)
            return start_date, today, 'Last 30 Days'

        elif period == 'this_month':
            start_date = today.replace(day=1)
            return start_date, today, 'This Month'

        elif period.startswith('custom:'):
            try:
                _, start_str, end_str = period.split(':')
                start_date = date.fromisoformat(start_str)
                end_date = date.fromisoformat(end_str)
                return start_date, end_date, f'{start_str} to {end_str}'
            except (ValueError, IndexError):
                # Fall back to 7 days
                start_date = today - timedelta(days=6)
                return start_date, today, 'Last 7 Days'

        else:
            # Default to 7 days
            start_date = today - timedelta(days=6)
            return start_date, today, 'Last 7 Days'

    def get_summary(self, start_date, end_date):
        """
        Get nutrition summary for the period.

        Returns:
            dict: Summary statistics including totals, averages, and tracking info
        """
        # Get all meals in the period
        meals = Meal.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        )

        # Calculate totals using aggregate (single DB query)
        totals = meals.aggregate(
            total_calories=Sum('total_calories'),
            total_protein=Sum('total_protein'),
            total_carbs=Sum('total_carbs'),
            total_fat=Sum('total_fat')
        )

        # Convert None to 0 (no meals in period)
        total_calories = float(totals['total_calories'] or 0)
        total_protein = float(totals['total_protein'] or 0)
        total_carbs = float(totals['total_carbs'] or 0)
        total_fat = float(totals['total_fat'] or 0)

        # Get unique days logged
        days_logged = meals.values('date').distinct().count()
        total_days = (end_date - start_date).days + 1

        # Calculate averages
        avg_calories = round(total_calories / days_logged) if days_logged > 0 else 0
        avg_protein = round(total_protein / days_logged, 1) if days_logged > 0 else 0
        avg_carbs = round(total_carbs / days_logged, 1) if days_logged > 0 else 0
        avg_fat = round(total_fat / days_logged, 1) if days_logged > 0 else 0

        # Get user's calorie target for deficit/surplus calculation
        calorie_target = getattr(self.user, 'calorie_target', 2000) or 2000
        daily_difference = avg_calories - calorie_target
        period_difference = daily_difference * days_logged

        return {
            'total_calories': round(total_calories),
            'total_protein': round(total_protein, 1),
            'total_carbs': round(total_carbs, 1),
            'total_fat': round(total_fat, 1),
            'avg_calories': avg_calories,
            'avg_protein': avg_protein,
            'avg_carbs': avg_carbs,
            'avg_fat': avg_fat,
            'days_logged': days_logged,
            'total_days': total_days,
            'tracking_rate': round((days_logged / total_days) * 100) if total_days > 0 else 0,
            'calorie_target': calorie_target,
            'daily_difference': round(daily_difference),
            'period_difference': round(period_difference),
            'is_surplus': daily_difference > 0,
        }

    def get_top_foods(self, start_date, end_date, limit=10):
        """
        Get most frequently eaten foods and biggest calorie contributors.

        Returns:
            dict: Contains 'most_frequent' and 'highest_calories' lists
        """
        # Get all meal foods in the period
        meal_foods = MealFood.objects.filter(
            meal__user=self.user,
            meal__date__gte=start_date,
            meal__date__lte=end_date
        ).select_related('food')

        # Group by food and calculate frequency and total calories
        food_stats = defaultdict(lambda: {'count': 0, 'total_calories': 0, 'name': ''})

        for meal_food_item in meal_foods:
            food_id = meal_food_item.food_id
            food_stats[food_id]['count'] += 1
            food_stats[food_id]['total_calories'] += float(meal_food_item.calories)
            food_stats[food_id]['name'] = meal_food_item.food.name

        # Convert to list for sorting
        foods_list = [
            {
                'food_id': food_id,
                'name': stats['name'],
                'times_eaten': stats['count'],
                'total_calories': round(stats['total_calories'])
            }
            for food_id, stats in food_stats.items()
        ]

        # Sort by frequency (most eaten first)
        most_frequent = sorted(
            foods_list,
            key=lambda food_entry: food_entry['times_eaten'],
            reverse=True
        )[:limit]

        # Sort by total calories (highest calorie contributor first)
        highest_calories = sorted(
            foods_list,
            key=lambda food_entry: food_entry['total_calories'],
            reverse=True
        )[:limit]

        return {
            'most_frequent': most_frequent,
            'highest_calories': highest_calories
        }

    def get_meal_distribution(self, start_date, end_date):
        """
        Get calorie distribution across meal types.

        Returns:
            dict: Breakdown by breakfast, lunch, dinner, snack
        """
        # Aggregate calories and meal count by meal_type
        distribution = Meal.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).values('meal_type').annotate(
            calories_sum=Sum('total_calories'),
            meal_count=Count('id'),
            avg_calories=Avg('total_calories')
        )

        # Calculate total for percentage calculation
        total_calories = sum(float(d['calories_sum'] or 0) for d in distribution)

        # Build result for each meal type
        meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
        result = {}

        for meal_type in meal_types:
            meal_data = next(
                (d for d in distribution if d['meal_type'] == meal_type),
                {'calories_sum': 0, 'meal_count': 0, 'avg_calories': 0}
            )

            type_calories = float(meal_data['calories_sum'] or 0)
            percentage = (type_calories / total_calories * 100) if total_calories > 0 else 0

            result[meal_type] = {
                'total_calories': round(type_calories),
                'percentage': round(percentage, 1),
                'meal_count': meal_data['meal_count'],
                'avg_calories': round(float(meal_data['avg_calories'] or 0))
            }

        return result

    def get_daily_patterns(self, start_date, end_date):
        """
        Analyze daily patterns - weekday vs weekend, highs/lows.

        Returns:
            dict: Pattern analysis including weekday/weekend comparison and extremes
        """
        # Get daily totals for the period
        daily_data = Meal.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).values('date').annotate(
            total_calories=Sum('total_calories'),
            total_protein=Sum('total_protein')
        ).order_by('date')

        if not daily_data:
            return {
                'weekday_avg': 0,
                'weekend_avg': 0,
                'weekday_weekend_diff': 0,
                'highest_day': None,
                'lowest_day': None,
                'most_consistent_day': None,
                'daily_data': []
            }

        # Separate weekday and weekend totals
        weekday_totals = []
        weekend_totals = []
        day_of_week_totals = defaultdict(list)

        daily_list = []
        for day in daily_data:
            day_date = day['date']
            calories = float(day['total_calories'] or 0)

            daily_list.append({
                'date': day_date.isoformat(),
                'calories': round(calories),
                'day_name': day_date.strftime('%A')
            })

            # Monday=0, Sunday=6
            weekday = day_date.weekday()
            if weekday < 5:
                weekday_totals.append(calories)
            else:
                weekend_totals.append(calories)

            day_of_week_totals[weekday].append(calories)

        # Calculate averages
        weekday_avg = round(sum(weekday_totals) / len(weekday_totals)) if weekday_totals else 0
        weekend_avg = round(sum(weekend_totals) / len(weekend_totals)) if weekend_totals else 0
        weekday_weekend_diff = weekend_avg - weekday_avg

        # Find highest and lowest calorie days
        sorted_by_calories = sorted(daily_list, key=lambda day_entry: day_entry['calories'])
        lowest_day = sorted_by_calories[0] if sorted_by_calories else None
        highest_day = sorted_by_calories[-1] if sorted_by_calories else None

        # Find most consistent day of the week (lowest variance)
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        most_consistent = None
        lowest_variance = float('inf')

        for weekday, calories_list in day_of_week_totals.items():
            if len(calories_list) >= 2:
                avg = sum(calories_list) / len(calories_list)
                variance = sum((cal - avg) ** 2 for cal in calories_list) / len(calories_list)
                if variance < lowest_variance:
                    lowest_variance = variance
                    most_consistent = day_names[weekday]

        return {
            'weekday_avg': weekday_avg,
            'weekend_avg': weekend_avg,
            'weekday_weekend_diff': round(weekday_weekend_diff),
            'highest_day': highest_day,
            'lowest_day': lowest_day,
            'most_consistent_day': most_consistent,
            'daily_data': daily_list
        }

    def get_nutrition_breakdown(self, start_date, end_date):
        """
        Detailed nutrition analysis including macro percentages and goal tracking.

        Returns:
            dict: Macro breakdown with percentages and goal tracking
        """
        # Get summary first for totals
        summary = self.get_summary(start_date, end_date)

        # Calculate macro percentages using standard calorie densities
        # protein = 4 cal/g, carbs = 4 cal/g, fat = 9 cal/g
        protein_cals = summary['avg_protein'] * 4
        carbs_cals = summary['avg_carbs'] * 4
        fat_cals = summary['avg_fat'] * 9
        total_macro_cals = protein_cals + carbs_cals + fat_cals

        if total_macro_cals > 0:
            protein_pct = round((protein_cals / total_macro_cals) * 100, 1)
            carbs_pct = round((carbs_cals / total_macro_cals) * 100, 1)
            fat_pct = round((fat_cals / total_macro_cals) * 100, 1)
        else:
            protein_pct = carbs_pct = fat_pct = 0

        # Get protein target if available
        protein_target = getattr(self.user, 'protein_target', None) or 50

        # Count days hitting protein goal
        daily_data = Meal.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).values('date').annotate(
            total_protein=Sum('total_protein'),
            total_fat=Sum('total_fat')
        )

        protein_goal_days = sum(
            1 for day_data in daily_data
            if float(day_data['total_protein'] or 0) >= protein_target
        )

        # Low protein days (under 80% of target)
        low_protein_days = sum(
            1 for day_data in daily_data
            if float(day_data['total_protein'] or 0) < protein_target * 0.8
        )

        return {
            'avg_protein': summary['avg_protein'],
            'avg_carbs': summary['avg_carbs'],
            'avg_fat': summary['avg_fat'],
            'protein_percentage': protein_pct,
            'carbs_percentage': carbs_pct,
            'fat_percentage': fat_pct,
            'protein_target': protein_target,
            'protein_goal_days': protein_goal_days,
            'low_protein_days': low_protein_days,
            'days_tracked': summary['days_logged'],
        }

    def get_notes_insights(self, start_date, end_date):
        """
        Calculate insights from daily notes correlated with meal data.

        Returns:
            dict: Tag frequency, calorie correlations, activity breakdown, outliers
        """
        # Get all notes in date range
        notes = DailyNote.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        )

        # Get daily calorie totals
        daily_calories = Meal.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).values('date').annotate(
            total_calories=Sum('total_calories')
        )

        # Build date -> calories lookup
        calories_by_date = {d['date']: float(d['total_calories'] or 0) for d in daily_calories}

        if not calories_by_date:
            return {
                'tag_frequency': [],
                'calorie_correlations': [],
                'activity_breakdown': [],
                'outlier_explanations': {'highest_days': [], 'lowest_days': []}
            }

        # Calculate overall average
        overall_avg = sum(calories_by_date.values()) / len(calories_by_date) if calories_by_date else 0

        # Calculate tag frequency and calories by tag
        tag_frequency = defaultdict(int)
        tag_calories = defaultdict(list)

        for note in notes:
            date_cals = calories_by_date.get(note.date, 0)
            if note.tags:
                for tag in note.tags:
                    tag_frequency[tag] += 1
                    tag_calories[tag].append(date_cals)

        # Calculate calorie correlations per tag
        calorie_correlations = []
        for tag, cal_list in tag_calories.items():
            avg_with_tag = sum(cal_list) / len(cal_list) if cal_list else 0
            calorie_correlations.append({
                'tag': tag,
                'days_count': len(cal_list),
                'avg_calories': round(avg_with_tag),
                'regular_avg': round(overall_avg),
                'difference': round(avg_with_tag - overall_avg)
            })

        # Calculate calories by activity level
        activity_calories = defaultdict(list)
        for note in notes:
            date_cals = calories_by_date.get(note.date, 0)
            activity_calories[note.activity_level].append(date_cals)

        activity_labels = {
            'rest': 'Rest Day',
            'light': 'Light',
            'moderate': 'Moderate',
            'active': 'Active'
        }

        activity_breakdown = []
        for level, cal_list in activity_calories.items():
            activity_breakdown.append({
                'level': level,
                'label': activity_labels.get(level, level.capitalize()),
                'days_count': len(cal_list),
                'avg_calories': round(sum(cal_list) / len(cal_list)) if cal_list else 0
            })

        # Sort activity breakdown by average calories
        activity_breakdown = sorted(activity_breakdown, key=lambda entry: entry['avg_calories'])

        # Find outlier days with note explanations
        sorted_days = sorted(calories_by_date.items(), key=lambda item: item[1], reverse=True)
        notes_dict = {note.date: note for note in notes}

        def format_outlier(day_date, calories):
            note = notes_dict.get(day_date)
            return {
                'date': day_date.isoformat() if hasattr(day_date, 'isoformat') else str(day_date),
                'calories': round(calories),
                'tags': note.tags if note and note.tags else [],
                'note_text': note.note_text if note else None,
                'activity_level': note.activity_level if note else None
            }

        highest = [format_outlier(d, c) for d, c in sorted_days[:5]]
        lowest = (
            [format_outlier(d, c) for d, c in sorted_days[-5:][::-1]]
            if len(sorted_days) >= 5
            else [format_outlier(d, c) for d, c in reversed(sorted_days[-5:])]
        )

        return {
            'tag_frequency': [
                {'tag': tag, 'count': cnt}
                for tag, cnt in sorted(tag_frequency.items(), key=lambda item: -item[1])
            ],
            'calorie_correlations': sorted(calorie_correlations, key=lambda item: -abs(item['difference'])),
            'activity_breakdown': activity_breakdown,
            'outlier_explanations': {
                'highest_days': highest,
                'lowest_days': lowest
            }
        }

    def get_exercise_summary(self, start_date, end_date):
        """
        Summarise exercise logs for the period.

        Returns:
            dict | None: Exercise stats, or None if no logs exist in the period
        """
        from api.exercise.models import ExerciseLog

        logs = ExerciseLog.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        )

        if not logs.exists():
            return None

        totals = logs.aggregate(
            total_calories_burned=Sum('calories_burned'),
            total_minutes=Sum('duration_minutes'),
            total_workouts=Count('id'),
        )

        active_days = logs.values('date').distinct().count()

        # Build per-exercise stats in Python (avoids case-sensitivity issues)
        exercise_stats = defaultdict(lambda: {'count': 0, 'total_minutes': 0, 'total_calories': 0.0})
        for log in logs:
            name = log.exercise_name
            exercise_stats[name]['count'] += 1
            exercise_stats[name]['total_minutes'] += log.duration_minutes
            exercise_stats[name]['total_calories'] += float(log.calories_burned)

        exercise_list = [
            {
                'name': name,
                'times_done': stats['count'],
                'total_minutes': stats['total_minutes'],
                'total_calories_burned': round(stats['total_calories']),
            }
            for name, stats in exercise_stats.items()
        ]

        most_frequent = sorted(exercise_list, key=lambda e: e['times_done'], reverse=True)[:5]
        most_calories = sorted(exercise_list, key=lambda e: e['total_calories_burned'], reverse=True)[:5]

        return {
            'total_workouts': totals['total_workouts'] or 0,
            'total_calories_burned': round(float(totals['total_calories_burned'] or 0)),
            'total_minutes': totals['total_minutes'] or 0,
            'active_days': active_days,
            'most_frequent': most_frequent,
            'most_calories': most_calories,
        }

    def generate_full_report(self, period='7d'):
        """
        Generate complete report with all sections.

        Args:
            period: Period string (7d, 30d, this_month, custom:start:end)

        Returns:
            dict: Complete report data
        """
        start_date, end_date, period_label = self.get_date_range(period)

        reports_logger.info(
            f"Generating report for user {self.user.id}: "
            f"{start_date} to {end_date} ({period_label})"
        )

        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'label': period_label,
            },
            'summary': self.get_summary(start_date, end_date),
            'top_foods': self.get_top_foods(start_date, end_date, limit=5),
            'meal_distribution': self.get_meal_distribution(start_date, end_date),
            'patterns': self.get_daily_patterns(start_date, end_date),
            'nutrition_breakdown': self.get_nutrition_breakdown(start_date, end_date),
            'notes_insights': self.get_notes_insights(start_date, end_date),
            'exercise_summary': self.get_exercise_summary(start_date, end_date),
        }
