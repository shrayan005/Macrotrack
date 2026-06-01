# FILE: api/analytics/views.py
# PURPOSE: Backend API endpoints for the dashboard's progress stats,
#          dashboard summary, and the Reports page.
#
# ENDPOINTS:
#   GET /api/dashboard/summary/       → get_dashboard_summary
#   GET /api/progress/stats/?days=30  → get_progress_stats
#   GET /api/reports/?period=7d       → get_reports
#
# USED BY:
#   - Dashboard.js for all dashboard calculations (daily totals, streaks, habit grid)
#   - ProgressPage.js for weight + calorie charts
#   - ReportsPage.js for the full weekly/monthly report
import logging
from datetime import datetime, timedelta


def _date_label(d):
    """Cross-platform short date label, e.g. '1 Jun'. Works on Windows and Linux."""
    return f"{d.day} {d.strftime('%b')}"

from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Import models from their canonical sub-package locations
from api.meals.models import Meal
from api.weight.models import WeightLog

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_summary(request):
    """
    GET /api/dashboard/summary/

    Returns everything the Dashboard page needs in a single request,
    computed on the backend so the frontend renders with zero calculation.

    Returns:
        daily_totals   — today's calories, protein, carbs, fat, fiber
        meal_breakdown — calories per meal type (breakfast/lunch/dinner/snack)
        habit_grid     — 30-day array of {date, meal_logged, weight_logged}
        calorie_chart  — last 7 days of {date, label, calories} for chart
        meal_streak    — consecutive days with at least one meal logged
        weight_streak  — consecutive days with a weight log
        recent_weight_change — weight change over the last 7 logged days
    """
    user = request.user
    today = datetime.now().date()
    thirty_days_ago = today - timedelta(days=29)
    seven_days_ago = today - timedelta(days=6)

    # ── Fetch raw data (two queries) ──────────────────────────────────────
    meals_30d = Meal.objects.filter(
        user=user,
        date__gte=thirty_days_ago,
        date__lte=today,
    ).values('date', 'meal_type', 'total_calories', 'total_protein',
             'total_carbs', 'total_fat', 'total_fiber')

    weight_logs_30d = list(
        WeightLog.objects.filter(
            user=user,
            date__gte=thirty_days_ago,
            date__lte=today,
        ).order_by('date').values('date', 'weight')
    )

    # ── Index data by date for O(1) lookups ───────────────────────────────
    meals_by_date = {}
    for m in meals_30d:
        d = str(m['date'])
        if d not in meals_by_date:
            meals_by_date[d] = []
        meals_by_date[d].append(m)

    weight_by_date = {str(w['date']): float(w['weight']) for w in weight_logs_30d}

    # ── Today's totals ────────────────────────────────────────────────────
    today_str = str(today)
    today_meals = meals_by_date.get(today_str, [])

    daily_totals = {
        'calories': round(sum(float(m['total_calories'] or 0) for m in today_meals), 1),
        'protein':  round(sum(float(m['total_protein']  or 0) for m in today_meals), 1),
        'carbs':    round(sum(float(m['total_carbs']    or 0) for m in today_meals), 1),
        'fat':      round(sum(float(m['total_fat']      or 0) for m in today_meals), 1),
        'fiber':    round(sum(float(m['total_fiber']    or 0) for m in today_meals), 1),
    }

    # ── Meal breakdown by type (today) ────────────────────────────────────
    meal_breakdown = {'breakfast': 0, 'lunch': 0, 'dinner': 0, 'snack': 0}
    for m in today_meals:
        mtype = m['meal_type']
        if mtype in meal_breakdown:
            meal_breakdown[mtype] = round(
                meal_breakdown[mtype] + float(m['total_calories'] or 0), 1
            )

    # ── Habit grid (30 days) ──────────────────────────────────────────────
    habit_grid = []
    for i in range(29, -1, -1):
        d = today - timedelta(days=i)
        d_str = str(d)
        habit_grid.append({
            'date':          d_str,
            'meal_logged':   d_str in meals_by_date,
            'weight_logged': d_str in weight_by_date,
        })

    # ── Calorie chart (last 7 days) ───────────────────────────────────────
    calorie_target = user.calorie_target or 2000
    calorie_chart = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        d_str = str(d)
        day_meals = meals_by_date.get(d_str, [])
        day_cals = round(sum(float(m['total_calories'] or 0) for m in day_meals), 1)
        calorie_chart.append({
            'date':     d_str,
            'label':    _date_label(d),
            'calories': day_cals,
            'target':   calorie_target,
        })

    # ── Streaks ───────────────────────────────────────────────────────────
    def compute_streak(date_set):
        streak = 0
        check = today
        while True:
            if str(check) in date_set:
                streak += 1
                check -= timedelta(days=1)
            elif check == today:
                # Allow today to be empty (streak counts up to yesterday)
                check -= timedelta(days=1)
                if str(check) not in date_set:
                    break
            else:
                break
        return streak

    meal_date_set   = set(meals_by_date.keys())
    weight_date_set = set(weight_by_date.keys())
    meal_streak   = compute_streak(meal_date_set)
    weight_streak = compute_streak(weight_date_set)

    # ── Recent weight change (last 7 logged days) ─────────────────────────
    recent_weight_change = None
    recent_weights = [w for w in weight_logs_30d if w['date'] >= seven_days_ago]
    if len(recent_weights) >= 2:
        recent_weight_change = round(
            float(recent_weights[-1]['weight']) - float(recent_weights[0]['weight']), 1
        )

    # ── Current weight ────────────────────────────────────────────────────
    current_weight = float(weight_logs_30d[-1]['weight']) if weight_logs_30d else None

    # ── Weight chart — last 7 logged entries (oldest first for chart) ─────
    last_7_weight_logs = weight_logs_30d[-7:] if weight_logs_30d else []
    weight_chart = [
        {'date': str(w['date']), 'weight': float(w['weight'])}
        for w in last_7_weight_logs
    ]

    return Response({
        'daily_totals':          daily_totals,
        'meal_breakdown':        meal_breakdown,
        'habit_grid':            habit_grid,
        'calorie_chart':         calorie_chart,
        'weight_chart':          weight_chart,
        'meal_streak':           meal_streak,
        'weight_streak':         weight_streak,
        'recent_weight_change':  recent_weight_change,
        'current_weight':        current_weight,
        'calorie_target':        calorie_target,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_progress_stats(request):
    """
    GET /api/progress/stats/?days=30

    Returns a summary of the user's nutrition and weight progress
    over the last N days. Called by the Progress page and the Coach page.

    Query params:
        days (int): How many days back to look (default: 30)

    What it calculates:
        - How many days the user logged meals
        - Average calories per day
        - Calorie adherence % (days within ±5% of their target)
        - Average protein / carbs / fat
        - Total weight change and weekly rate of change

    Returns:
        200: {
            date_range: { start, end },
            calories: { average, target, adherence_percent, days_logged },
            macros: { protein_avg, carbs_avg, fat_avg },
            weight: { change, weekly_rate }
        }
    """
    from django.db.models import Sum, Avg

    user = request.user
    # ?days=30 → analyze the last 30 days (default)
    days = int(request.GET.get('days', 30))

    # Calculate the date window: from N days ago to today
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)

    # Fetch all meals for this user within the date range
    # prefetch_related loads MealFood + Food rows in bulk (avoids N+1 queries)
    meals = Meal.objects.filter(
        user=user,
        date__gte=start_date,
        date__lte=end_date
    ).prefetch_related('meal_foods', 'meal_foods__food')

    # Fetch all weight logs for this user within the date range, oldest first
    weight_logs = WeightLog.objects.filter(
        user=user,
        date__gte=start_date,
        date__lte=end_date
    ).order_by('date')

    # ── CALORIE STATS ──────────────────────────────────────────────────────
    total_meals = meals.count()
    # How many distinct calendar dates had at least one meal logged?
    days_logged = meals.values('date').distinct().count()

    # Fall back to 2000 kcal if the user never set a calorie target
    calorie_target = user.calorie_target if user.calorie_target else 2000
    average_calories = 0
    adherence_percent = 0

    if total_meals > 0:
        # Group meals by date and sum calories per day
        # daily_totals is a queryset like: [{'date': '2026-03-01', 'daily_calories': 1850}, ...]
        daily_totals = meals.values('date').annotate(
            daily_calories=Sum('total_calories')
        )

        total_calories = sum([day['daily_calories'] for day in daily_totals if day['daily_calories']])
        average_calories = total_calories / len(daily_totals) if daily_totals else 0

        # Adherence = % of days where the user hit within ±10% of their calorie target
        # e.g. if target = 2000, a day is "adherent" if calories were between 1800–2200
        # Matches the coach's definition so both pages show the same number.
        adherent_days = 0
        for day in daily_totals:
            if day['daily_calories']:
                daily_cal = float(day['daily_calories'])
                if abs(daily_cal - calorie_target) <= (calorie_target * 0.10):
                    adherent_days += 1

        adherence_percent = (adherent_days / len(daily_totals) * 100) if daily_totals else 0

    # ── MACRO AVERAGES ─────────────────────────────────────────────────────
    # Avg() calculates the mean across all meal rows (not per-day — per meal)
    macro_totals = meals.aggregate(
        avg_protein=Avg('total_protein'),
        avg_carbs=Avg('total_carbs'),
        avg_fat=Avg('total_fat')
    )

    # ── WEIGHT CHANGE ──────────────────────────────────────────────────────
    weight_change = 0.0
    weekly_rate = 0.0

    if weight_logs.count() >= 2:
        # Compare oldest and newest weight log in the window
        first_weight = weight_logs.first().weight
        last_weight  = weight_logs.last().weight
        weight_change = float(last_weight) - float(first_weight)

        # Weekly rate: how much weight is the user gaining/losing per week?
        # Formula: total_change / total_days * 7
        days_tracked = (weight_logs.last().date - weight_logs.first().date).days
        if days_tracked > 0:
            weekly_rate = (weight_change / days_tracked) * 7

    # ── DAILY BREAKDOWN (per-day array for charts) ─────────────────────────
    # Build a lookup: date → {calories, protein, carbs, fat} for each day in range
    daily_map = {}
    if total_meals > 0:
        per_day = meals.values('date').annotate(
            day_calories=Sum('total_calories'),
            day_protein=Sum('total_protein'),
            day_carbs=Sum('total_carbs'),
            day_fat=Sum('total_fat'),
        )
        for row in per_day:
            daily_map[str(row['date'])] = {
                'calories': round(float(row['day_calories'] or 0), 1),
                'protein':  round(float(row['day_protein']  or 0), 1),
                'carbs':    round(float(row['day_carbs']    or 0), 1),
                'fat':      round(float(row['day_fat']      or 0), 1),
            }

    # Build a full array covering every day in the range (zeros for days with no logs)
    daily_breakdown = []
    check = start_date
    while check <= end_date:
        d_str = check.isoformat()
        entry = daily_map.get(d_str, {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0})
        daily_breakdown.append({
            'date':  d_str,
            'label': _date_label(check),
            **entry,
        })
        check += timedelta(days=1)

    # ── PER-DAY MACRO AVERAGES (only logged days) ──────────────────────────
    logged_days_data = [v for v in daily_map.values()]
    n_logged = len(logged_days_data)
    avg_protein_per_day = round(sum(d['protein'] for d in logged_days_data) / n_logged, 1) if n_logged else 0
    avg_carbs_per_day   = round(sum(d['carbs']   for d in logged_days_data) / n_logged, 1) if n_logged else 0
    avg_fat_per_day     = round(sum(d['fat']      for d in logged_days_data) / n_logged, 1) if n_logged else 0

    # ── CALORIE COMPLIANCE ──────────────────────────────────────────────────
    if total_meals > 0:
        ok_days = sum(
            1 for d in logged_days_data
            if 0 < d['calories'] <= calorie_target * 1.05
        )
        compliance_pct = round((ok_days / n_logged * 100) if n_logged else 0, 1)
    else:
        compliance_pct = 0.0

    # ── DAILY WEIGHT ARRAY (forward-filled for chart) ──────────────────────
    weight_by_date = {str(w.date): float(w.weight) for w in weight_logs}
    last_weight_val = None
    daily_weight = []
    check = start_date
    while check <= end_date:
        d_str = check.isoformat()
        if d_str in weight_by_date:
            last_weight_val = weight_by_date[d_str]
        daily_weight.append({
            'date':   d_str,
            'label':  _date_label(check),
            'weight': last_weight_val,
        })
        check += timedelta(days=1)

    return Response({
        'date_range': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
        },
        'calories': {
            'average':          round(average_calories, 1),
            'target':           calorie_target,
            'adherence_percent': round(adherence_percent, 1),
            'compliance_pct':   compliance_pct,
            'days_logged':      days_logged,
        },
        'macros': {
            'protein_avg': avg_protein_per_day,
            'carbs_avg':   avg_carbs_per_day,
            'fat_avg':     avg_fat_per_day,
        },
        'weight': {
            'change':      round(weight_change, 2),
            'weekly_rate': round(weekly_rate, 2),
        },
        'daily_breakdown': daily_breakdown,
        'daily_weight':    daily_weight,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reports(request):
    """
    GET /api/reports/?period=7d

    Generates a comprehensive nutrition report for the given time period.
    Used by the Reports page (not the dashboard directly).

    Query params:
        period (str):
            '7d'                      → last 7 days (default)
            '30d'                     → last 30 days
            'this_month'              → current calendar month
            'custom:YYYY-MM-DD:YYYY-MM-DD' → custom date range

    The heavy lifting is delegated to ReportsService (api/analytics/service.py)
    which builds a structured report including:
        - Summary stats (avg calories, macro breakdown, top foods)
        - Meal distribution (how many calories per meal type)
        - Day-by-day patterns
        - Nutrition breakdown charts

    Returns:
        200: Full report dict (structure defined in ReportsService)
        500: { error: "Failed to generate report." } if something goes wrong
    """
    # Lazy import — ReportsService is defined in api/analytics/service.py
    from api.analytics.service import ReportsService

    period = request.GET.get('period', '7d')

    try:
        # ReportsService takes the user and builds the full report
        reports_service = ReportsService(request.user)
        report_data = reports_service.generate_full_report(period)

        return Response(report_data, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error generating report for user {request.user.id}: {str(e)}")
        return Response(
            {'error': 'Failed to generate report. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

__all__ = [
    'get_dashboard_summary',
    'get_progress_stats',
    'get_reports',
]
