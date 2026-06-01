# FILE: api/coach/views.py
# PURPOSE: Function-based views for all AI coach endpoints —
#          analysis, check-in submission, calorie adjustment acceptance,
#          goal updates, and check-in history.
# USED BY: api/views.py (re-exporter), api/urls.py
# KEY FUNCTIONS:
#   get_coach_analysis      — MacroFactor-style TDEE + adjustment recommendation
#   submit_check_in         — record a weekly check-in
#   accept_calorie_adjustment — update user's calorie target
#   update_coach_goal       — update user's goal/rate/target
#   get_check_in_history    — list past check-ins
from django.conf import settings as django_settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from datetime import datetime, timedelta
import logging

# Import models from sub-packages
from api.meals.models import Meal
from api.weight.models import WeightLog
from api.coach.models import UserCheckIn

# Cache utility for fast current-weight lookup
from api.cache_utils import get_current_weight

logger = logging.getLogger(__name__)

# HELPER FUNCTIONS (used by get_coach_analysis)
def _mean(values):
    """Safe mean of a list of numeric values."""
    nums = [float(v) for v in values if v is not None]
    return sum(nums) / len(nums) if nums else None


def calculate_tdee(weight_change_kg, days, average_daily_calories):
    """
    TDEE via energy balance: TDEE = Avg Intake − (Weight Change × 7700) / Days

    Uses actual observed data (not generic formulas) so it adapts to each user's
    real metabolism. Negative weight_change = net loss = the user was in deficit.
    """
    if not days:
        return None
    kcal_per_kg = django_settings.CALORIES_PER_KG_BODY_WEIGHT
    weight_energy_per_day = (float(weight_change_kg) * kcal_per_kg) / float(days)
    return round(float(average_daily_calories) - weight_energy_per_day)


def calculate_confidence(weight_logs_list):
    """
    Confidence based on the SPAN of available weight data, not just the count.

    A 7-day span with 7 logs is far more informative than a 60-day span with 7 logs
    is to the formula, but 14+ days of actual coverage gives a reliable trend.

    Returns: (confidence_float 0–1, confidence_range_int)
    """
    if len(weight_logs_list) < 2:
        return 0.3, 0
    span_days = (weight_logs_list[-1].date - weight_logs_list[0].date).days
    if span_days >= 21:
        return 1.0, 0   # high — 3+ weeks of data
    elif span_days >= 14:
        return 0.7, 0   # medium-high — 2 weeks
    elif span_days >= 7:
        return 0.5, 0   # medium — 1 week
    else:
        return 0.3, 0   # low — less than a week


def generate_insights(user, weekly_rate, adherence, streak, days_logged):
    """
    Generate insight cards on the backend so frontend is purely presentational.

    Each card: { type: 'success'|'info'|'warning', title: str, message: str }
    Type maps directly to the CSS class `insight-<type>` in CoachPage.
    """
    insights = []
    goal = (user.goal or 'maintain').lower()

    # ── Weight rate insight (goal-aware) ──────────────────────────────────
    if weekly_rate is not None:
        abs_rate = abs(weekly_rate)
        if goal == 'lose':
            if weekly_rate < -1.0:
                insights.append({
                    'type': 'warning',
                    'title': 'Losing Too Fast',
                    'message': f"You're losing {abs_rate:.2f} kg/week. This risks muscle loss — aim for 0.25–0.75 kg/week.",
                })
            elif weekly_rate <= -0.1:
                insights.append({
                    'type': 'success',
                    'title': 'Healthy Weight Loss',
                    'message': f"You're losing {abs_rate:.2f} kg/week — ideal for preserving muscle.",
                })
            else:
                insights.append({
                    'type': 'info',
                    'title': 'Weight Stable or Increasing',
                    'message': f"Your trend is {'+' if weekly_rate > 0 else ''}{weekly_rate:.2f} kg/week. Follow the recommendation above.",
                })
        elif goal == 'gain':
            if weekly_rate > 0.5:
                insights.append({
                    'type': 'warning',
                    'title': 'Gaining Too Fast',
                    'message': f"You're gaining {weekly_rate:.2f} kg/week. Aim for 0.25–0.5 kg/week for lean gains.",
                })
            elif weekly_rate > 0.05:
                insights.append({
                    'type': 'success',
                    'title': 'Optimal Muscle Gain',
                    'message': f"You're gaining {weekly_rate:.2f} kg/week — excellent for lean muscle.",
                })
            else:
                insights.append({
                    'type': 'info',
                    'title': 'Not Gaining Yet',
                    'message': "Your weight is stable or decreasing. Consider increasing calories slightly.",
                })
        else:  # maintain
            if abs_rate < 0.2:
                insights.append({
                    'type': 'success',
                    'title': 'Weight Stable',
                    'message': "Your weight is holding steady — perfect maintenance.",
                })
            else:
                direction = 'up' if weekly_rate > 0 else 'down'
                insights.append({
                    'type': 'info',
                    'title': 'Weight Drifting',
                    'message': f"Your weight is trending {direction} by {abs_rate:.2f} kg/week.",
                })

    # ── Adherence insight ─────────────────────────────────────────────────
    if adherence >= 80:
        insights.append({
            'type': 'success',
            'title': 'Excellent Adherence',
            'message': f"You hit your calorie target {adherence:.0f}% of the time this period.",
        })
    elif adherence >= 60:
        insights.append({
            'type': 'info',
            'title': 'Good Adherence',
            'message': f"{adherence:.0f}% adherence. More consistency will improve your results.",
        })
    elif adherence > 0:
        insights.append({
            'type': 'warning',
            'title': 'Low Adherence',
            'message': f"{adherence:.0f}% adherence. Try to hit your calorie target more consistently.",
        })

    # ── Streak insight ────────────────────────────────────────────────────
    if streak >= 14:
        insights.append({
            'type': 'success',
            'title': 'Impressive Streak',
            'message': f"{streak}-day logging streak. Consistency is the foundation of results.",
        })
    elif streak >= 7:
        insights.append({
            'type': 'success',
            'title': 'Great Streak',
            'message': f"{streak} days in a row. Keep the momentum going.",
        })
    elif days_logged < 7:
        insights.append({
            'type': 'warning',
            'title': 'Track More Consistently',
            'message': f"You've logged {days_logged} days recently. More data means better, more accurate recommendations.",
        })

    return insights

def generate_dynamic_recommendations(user, meals, weight_logs, average_calories, adherence, weekly_rate):
    """
    Generate personalized recommendations based on user's data patterns.
    Analyzes meal timing, weekend patterns, protein consistency, and plateaus.
    """
    from django.db.models import Sum, Avg

    recommendations = []
    end_date = datetime.now().date()

    # 1. Weekend vs Weekday Pattern Analysis
    try:
        weekend_meals = meals.filter(date__week_day__in=[1, 7])  # Sunday=1, Saturday=7
        weekday_meals = meals.exclude(date__week_day__in=[1, 7])

        weekend_daily = weekend_meals.values('date').annotate(daily_cal=Sum('total_calories'))
        weekday_daily = weekday_meals.values('date').annotate(daily_cal=Sum('total_calories'))

        weekend_avg = sum([d['daily_cal'] or 0 for d in weekend_daily]) / max(len(weekend_daily), 1)
        weekday_avg = sum([d['daily_cal'] or 0 for d in weekday_daily]) / max(len(weekday_daily), 1)

        if weekday_avg > 0 and weekend_avg > weekday_avg * 1.15:
            diff = int(weekend_avg - weekday_avg)
            recommendations.append({
                'category': 'pattern',
                'priority': 'medium',
                'title': 'Weekend Calorie Spike',
                'description': f"Your weekend intake averages {diff} calories higher than weekdays. Try planning Saturday meals in advance.",
                'icon': 'calendar'
            })
    except Exception:
        pass

    # 2. Protein Consistency Check
    try:
        protein_target = user.protein_target or (user.weight * 1.6 if user.weight else 120)
        daily_protein = meals.values('date').annotate(daily_protein=Sum('total_protein'))

        days_hitting_protein = sum(1 for d in daily_protein if (d['daily_protein'] or 0) >= protein_target * 0.9)
        total_days = len(daily_protein)

        if total_days >= 7 and days_hitting_protein < total_days * 0.5:
            recommendations.append({
                'category': 'nutrition',
                'priority': 'high' if days_hitting_protein < total_days * 0.3 else 'medium',
                'title': 'Boost Protein Consistency',
                'description': f"You're hitting protein targets {days_hitting_protein}/{total_days} days. Add a protein source to breakfast to hit it more consistently.",
                'icon': 'dumbbell'
            })
        elif total_days >= 7 and days_hitting_protein >= total_days * 0.8:
            recommendations.append({
                'category': 'nutrition',
                'priority': 'low',
                'title': 'Excellent Protein Intake',
                'description': f"You're hitting protein targets {days_hitting_protein}/{total_days} days. Keep up the great work!",
                'icon': 'check-circle'
            })
    except Exception:
        pass

    # 3. Plateau Detection (2+ weeks with minimal weight change)
    try:
        if weight_logs.count() >= 14:
            week1 = weight_logs.filter(date__gte=end_date - timedelta(days=7))
            week2 = weight_logs.filter(date__gte=end_date - timedelta(days=14), date__lt=end_date - timedelta(days=7))

            if week1.exists() and week2.exists():
                avg1 = week1.aggregate(Avg('weight'))['weight__avg']
                avg2 = week2.aggregate(Avg('weight'))['weight__avg']

                if avg1 and avg2 and abs(float(avg1) - float(avg2)) < 0.2:
                    if user.goal in ['lose', 'lose_weight']:
                        recommendations.append({
                            'category': 'progress',
                            'priority': 'high',
                            'title': 'Break Through Your Plateau',
                            'description': "Your weight has been stable for 2+ weeks. Consider a small calorie adjustment or increasing activity.",
                            'icon': 'trending-up',
                            'action': {
                                'type': 'adjust_calories',
                                'value': -100
                            }
                        })
    except Exception:
        pass

    # 4. Adherence-Based Recommendations
    if adherence < 50:
        recommendations.append({
            'category': 'adherence',
            'priority': 'high',
            'title': 'Build Consistency First',
            'description': "Focus on logging consistently before worrying about hitting exact targets. Track everything, even if you go over.",
            'icon': 'target'
        })
    elif adherence < 70:
        recommendations.append({
            'category': 'adherence',
            'priority': 'medium',
            'title': 'Improve Adherence',
            'description': f"You're within target {adherence:.0f}% of days. Try meal prepping or planning your meals the night before.",
            'icon': 'clipboard'
        })
    elif adherence >= 90:
        recommendations.append({
            'category': 'adherence',
            'priority': 'low',
            'title': 'Outstanding Consistency',
            'description': f"Amazing! {adherence:.0f}% adherence shows incredible discipline. Consider adding variety to prevent burnout.",
            'icon': 'star'
        })

    # 5. Weight Logging Frequency
    try:
        weight_count = weight_logs.count()
        if weight_count < 7:
            recommendations.append({
                'category': 'tracking',
                'priority': 'medium',
                'title': 'Log Weight More Often',
                'description': "Weighing yourself daily (same time, before eating) gives more accurate trend data. Don't stress about daily fluctuations!",
                'icon': 'scale'
            })
    except Exception:
        pass

    # Sort by priority (high first) — return only what actually applies, no padding
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda rec: priority_order.get(rec['priority'], 1))

    return recommendations

# COACH ANALYSIS
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_coach_analysis(request):
    """
    GET /api/coach/analysis/
    MacroFactor-style adaptive TDEE coaching with energy balance calculations.

    This upgraded version:
    - Calculates actual TDEE using energy balance
    - Uses weighted moving averages for noise filtering
    - Requires 28 days minimum for accuracy
    - Provides confidence intervals
    - Makes smaller, more frequent adjustments

    Returns:
        200: Coach analysis including TDEE, calorie adjustment, insights, key metrics, and goal projection
    """
    from django.db.models import Sum, Avg

    user = request.user

    # Get last 42 days of data (6 weeks for better accuracy)
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=42)

    # Optimize query: prefetch related meal_foods and foods to avoid N+1 queries
    meals = Meal.objects.filter(user=user, date__gte=start_date, date__lte=end_date).prefetch_related(
        'meal_foods',
        'meal_foods__food'
    )
    weight_logs = WeightLog.objects.filter(user=user, date__gte=start_date, date__lte=end_date).order_by('date')

    # Calculate key metrics
    total_meals = meals.count()
    days_logged = meals.values('date').distinct().count()

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

    # Calculate adherence and average calories
    calorie_target = user.calorie_target if user.calorie_target else 2000
    adherence = 0
    average_calories = 0

    if days_logged > 0:
        daily_totals = meals.values('date').annotate(daily_calories=Sum('total_calories'))
        adherent_days = sum(1 for day in daily_totals if day['daily_calories'] and abs(float(day['daily_calories']) - calorie_target) <= (calorie_target * 0.1))
        adherence = (adherent_days / days_logged * 100) if days_logged > 0 else 0

        total_calories = sum([day['daily_calories'] for day in daily_totals if day['daily_calories']])
        average_calories = total_calories / len(daily_totals) if daily_totals else 0

    # ============================================================================
    #  TDEE CALCULATION
    # ============================================================================

    tdee = None
    tdee_confidence = 0.0
    tdee_confidence_range = 0
    weekly_rate = 0.0
    adjustment = 0
    recommended_target = calorie_target
    reason = "Insufficient data. Log meals and weight for at least 28 days for TDEE calculation."

    # ── TDEE: require 14 weight logs AND 7 meal-log days ─────────────────
    # Also require the meal days to be spread over at least 7 calendar days
    # so a single heavy-logging session doesn't count.
    weight_logs_list = list(weight_logs)  # evaluated once; used for rolling avg + span

    # Check meal log sufficiency: how many distinct calendar days have meals?
    meal_days_count = meals.values('date').distinct().count()

    if len(weight_logs_list) >= 14 and meal_days_count >= 7:
        # ── Rolling-average start / end weights (7-log windows) ──────────
        # Using the first 7 and last 7 logs smooths out daily water-retention
        # noise far better than a raw first-vs-last comparison.
        window = min(7, len(weight_logs_list) // 2)
        start_weight = _mean([w.weight for w in weight_logs_list[:window]])
        end_weight   = _mean([w.weight for w in weight_logs_list[-window:]])

        # ── Span in days between the midpoints of each window ────────────
        span_days = (weight_logs_list[-1].date - weight_logs_list[0].date).days

        if start_weight and end_weight and average_calories > 0 and span_days > 0:
            weight_change = end_weight - start_weight

            # Weekly rate: (total change) / (total days) × 7  — not a midpoint split
            weekly_rate = round((weight_change / span_days) * 7, 3)

            tdee = calculate_tdee(weight_change, span_days, average_calories)
            tdee_confidence, tdee_confidence_range = calculate_confidence(weight_logs_list)

            # ── Adjustment calculation ────────────────────────────────────
            target_rates = {
                'lose_weight': {'slow': -0.25, 'moderate': -0.5, 'aggressive': -0.75},
                'gain_weight': {'slow': 0.25, 'moderate': 0.5, 'aggressive': 0.75},
                'maintain':    {'slow': 0,    'moderate': 0,    'aggressive': 0},
            }
            goal_mapping = {'lose': 'lose_weight', 'gain': 'gain_weight', 'maintain': 'maintain'}
            user_goal_key = goal_mapping.get(user.goal, user.goal) if user.goal else 'maintain'
            goal_key = user_goal_key if user_goal_key in target_rates else 'maintain'
            rate_preference = user.rate if user.rate in ['slow', 'moderate', 'aggressive'] else 'moderate'
            target_rate = target_rates[goal_key][rate_preference]

            ideal_target = tdee + (target_rate * 1100)
            raw_adjustment = ideal_target - calorie_target
            adjustment = int(round(raw_adjustment / 50) * 50)
            adjustment = max(-200, min(200, adjustment))
            recommended_target = calorie_target + adjustment

            if abs(adjustment) <= 50:
                reason = f"Your estimated TDEE is {tdee} cal/day. You're on track — no change needed."
            elif adjustment > 0:
                reason = f"Your estimated TDEE is {tdee} cal/day. Consider eating {adjustment} more calories per day to match your {rate_preference} goal."
            else:
                reason = f"Your estimated TDEE is {tdee} cal/day. Consider reducing intake by {abs(adjustment)} calories per day."

    # ── Insight cards generated on the backend (no frontend calculation) ─
    insights = generate_insights(user, weekly_rate, adherence, streak, days_logged)

    # Goal projection
    estimated_weeks = None
    estimated_date = None

    # Get current weight — use cached value for better performance
    current_weight = get_current_weight(user) or user.weight

    if user.goal_weight and weekly_rate != 0 and current_weight:
        remaining = float(user.goal_weight) - float(current_weight)
        if abs(weekly_rate) > 0.05:
            estimated_weeks = int(abs(remaining) / abs(weekly_rate))
            if estimated_weeks > 0:
                estimated_date = (datetime.now() + timedelta(weeks=estimated_weeks)).date().isoformat()

    # Calculate progress percentage for goal projection.
    # Use the weight log closest to (on or after) goal_set_date as start_weight so
    # the bar resets whenever the user changes their goal.
    if user.goal_set_date:
        # Find the first weight log on or after the day the current goal was set
        start_log = (
            WeightLog.objects
            .filter(user=user, date__gte=user.goal_set_date)
            .order_by('date')
            .first()
        )
        if not start_log:
            # Fallback: the last log before goal_set_date (user hadn't logged yet after goal change)
            start_log = (
                WeightLog.objects
                .filter(user=user, date__lt=user.goal_set_date)
                .order_by('-date')
                .first()
            )
    else:
        # No goal_set_date recorded — fall back to all-time first weight log
        start_log = WeightLog.objects.filter(user=user).order_by('date').first()

    start_weight = float(start_log.weight) if start_log else (float(user.weight) if user.weight else 0)
    current_weight_val = float(current_weight) if current_weight else start_weight
    goal_weight_val = float(user.goal_weight) if user.goal_weight else current_weight_val

    progress_percent = 0
    if start_weight != goal_weight_val:
        progress_percent = min(100, max(0, ((start_weight - current_weight_val) / (start_weight - goal_weight_val)) * 100))

    # Generate dynamic recommendations based on user patterns
    recommendations = generate_dynamic_recommendations(user, meals, weight_logs, average_calories, adherence, weekly_rate)

    # Get last check-in date for display
    last_checkin = UserCheckIn.objects.filter(user=user).order_by('-date').first()

    return Response({
        'calorie_adjustment': {
            'current_target': calorie_target,
            'recommended_target': recommended_target,
            'adjustment': adjustment,
            'reason': reason,
        },
        'tdee': {
            'value': tdee,
            'confidence': tdee_confidence,
            'confidence_range': tdee_confidence_range,
            'calculated': tdee is not None,
        },
        'insights': insights,
        'key_metrics': {
            'weekly_rate': round(weekly_rate, 2),
            'adherence': round(adherence, 1),
            'streak': streak,
            'days_logged': days_logged,
            'average_calories': round(average_calories, 0) if average_calories else 0,
            'tdee': tdee,
            'tdee_confidence': tdee_confidence,
        },
        'goal_projection': {
            'current_weight': float(current_weight) if current_weight else None,
            'goal_weight': float(user.goal_weight) if user.goal_weight else None,
            'start_weight': start_weight,
            'weekly_rate': round(weekly_rate, 2),
            'estimated_weeks': estimated_weeks,
            'estimated_date': estimated_date,
            'progress_percent': round(progress_percent, 1),
        },
        'recommendations': recommendations,
        'user_settings': {
            'goal': user.goal,
            'rate': user.rate,
            'calorie_target': user.calorie_target,
            'goal_weight': float(user.goal_weight) if user.goal_weight else None,
            'checkin_day': user.checkin_day,
        },
        'last_checkin': {
            'date': last_checkin.date.isoformat() if last_checkin else None,
            'days_since': (end_date - last_checkin.date).days if last_checkin else None,
        },
    }, status=status.HTTP_200_OK)

# CHECK-IN ENDPOINTS
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_check_in(request):
    """
    POST /api/coach/check-in/
    Submit a weekly check-in and optionally update calorie targets.

    Body:
        - reflection: 'great', 'okay', 'struggled'
        - notes: Optional text notes
        - accepted_adjustment: Boolean - whether user accepted calorie recommendation
        - new_calorie_target: New calorie target if accepted
        - new_goal: Optional new goal
        - new_rate: Optional new rate
        - current_weight: Current weight at check-in
        - weekly_rate: Weekly rate at check-in
        - adherence_percent: Adherence at check-in

    Returns:
        201: Check-in created successfully
        400: Invalid data
    """
    user = request.user
    data = request.data

    current_target = user.calorie_target or 2000
    new_target = data.get('new_calorie_target', current_target)

    # Create check-in record in the database
    checkin = UserCheckIn.objects.create(
        user=user,
        date=datetime.now().date(),
        weight_at_checkin=data.get('current_weight'),
        calorie_target_before=current_target,
        calorie_target_after=new_target if data.get('accepted_adjustment') else current_target,
        reflection=data.get('reflection'),
        notes=data.get('notes'),
        accepted_adjustment=data.get('accepted_adjustment', False),
        goal_changed=bool(data.get('new_goal')),
        rate_changed=bool(data.get('new_rate')),
        weekly_rate=data.get('weekly_rate'),
        adherence_percent=data.get('adherence_percent'),
    )

    # Update user profile if adjustments accepted
    updates = []
    if data.get('accepted_adjustment') and data.get('new_calorie_target'):
        user.calorie_target = int(data['new_calorie_target'])
        updates.append('calorie_target')

    goal_changed_in_checkin = False

    if data.get('new_goal'):
        if user.goal != data['new_goal']:
            goal_changed_in_checkin = True
        user.goal = data['new_goal']
        updates.append('goal')

    if data.get('new_rate'):
        user.rate = data['new_rate']
        updates.append('rate')

    # Reset progress bar anchor whenever goal changes via check-in
    if goal_changed_in_checkin:
        user.goal_set_date = datetime.now().date()
        updates.append('goal_set_date')

    if updates:
        # update_fields limits the save to only the changed columns
        user.save(update_fields=updates)

    return Response({
        'success': True,
        'check_in_id': checkin.id,
        'updated_profile': {
            'calorie_target': user.calorie_target,
            'goal': user.goal,
            'rate': user.rate,
        }
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_calorie_adjustment(request):
    """
    POST /api/coach/accept-adjustment/
    Accept recommended calorie adjustment and update user profile.

    Body:
        - calorie_target: New calorie target to set

    Returns:
        200: Target updated successfully
        400: Invalid data
    """
    user = request.user
    new_target = request.data.get('calorie_target')

    if not new_target:
        return Response({'error': 'calorie_target is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        new_target = int(float(new_target))
    except (ValueError, TypeError):
        return Response({'error': 'Invalid calorie_target value'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate target is within safe range
    min_calories = getattr(settings, 'MINIMUM_CALORIES_FEMALE', 1200)
    max_calories = 10000
    if new_target < min_calories or new_target > max_calories:
        return Response(
            {'error': f'calorie_target must be between {min_calories} and {max_calories}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        user.calorie_target = new_target
        user.save(update_fields=['calorie_target'])
    except Exception as e:
        logger.error("Failed to update calorie target for user %s: %s", user.id, e, exc_info=True)
        return Response({'error': 'Failed to update calorie target. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'success': True,
        'calorie_target': user.calorie_target,
    }, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_coach_goal(request):
    """
    PUT /api/coach/update-goal/
    Update user's goal and/or rate from the coach page.

    Body:
        - goal: 'lose', 'maintain', 'gain'
        - rate: 'slow', 'moderate', 'aggressive'
        - calorie_target: Optional new calorie target

    Returns:
        200: Settings updated successfully
        400: Invalid data
    """
    user = request.user
    data = request.data
    updates = []

    goal_changed = False

    if 'goal' in data:
        if data['goal'] not in ['lose', 'maintain', 'gain', 'lose_weight', 'gain_weight']:
            return Response({'error': 'Invalid goal value'}, status=status.HTTP_400_BAD_REQUEST)
        if user.goal != data['goal']:
            goal_changed = True
        user.goal = data['goal']
        updates.append('goal')

    if 'goal_weight' in data:
        try:
            new_goal_weight = float(data['goal_weight']) if data['goal_weight'] else None
            if user.goal_weight != new_goal_weight:
                goal_changed = True
            user.goal_weight = new_goal_weight
            updates.append('goal_weight')
        except (ValueError, TypeError):
            return Response({'error': 'Invalid goal_weight value'}, status=status.HTTP_400_BAD_REQUEST)

    if 'rate' in data:
        if data['rate'] not in ['slow', 'moderate', 'aggressive']:
            return Response({'error': 'Invalid rate value'}, status=status.HTTP_400_BAD_REQUEST)
        user.rate = data['rate']
        updates.append('rate')

    if 'calorie_target' in data:
        try:
            user.calorie_target = int(data['calorie_target'])
            updates.append('calorie_target')
        except (ValueError, TypeError):
            return Response({'error': 'Invalid calorie_target value'}, status=status.HTTP_400_BAD_REQUEST)

    # Stamp goal_set_date whenever goal or goal_weight changes so the progress
    # bar starts fresh from today's weight.
    if goal_changed:
        user.goal_set_date = datetime.now().date()
        updates.append('goal_set_date')

    if updates:
        user.save(update_fields=updates)

    return Response({
        'success': True,
        'goal': user.goal,
        'rate': user.rate,
        'calorie_target': user.calorie_target,
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_check_in_history(request):
    """
    GET /api/coach/check-ins/
    Get user's check-in history.

    Query params:
        - limit: Number of results (default: 10, max: 50)

    Returns:
        200: List of check-ins
    """
    user = request.user
    limit = min(int(request.GET.get('limit', 10)), 50)

    # Fetch the most recent check-ins for this user
    check_ins = UserCheckIn.objects.filter(user=user)[:limit]

    results = []
    for check_in_item in check_ins:
        results.append({
            'id': check_in_item.id,
            'date': check_in_item.date.isoformat(),
            'weight_at_checkin': float(check_in_item.weight_at_checkin) if check_in_item.weight_at_checkin else None,
            'calorie_target_before': check_in_item.calorie_target_before,
            'calorie_target_after': check_in_item.calorie_target_after,
            'reflection': check_in_item.reflection,
            'accepted_adjustment': check_in_item.accepted_adjustment,
            'weekly_rate': float(check_in_item.weekly_rate) if check_in_item.weekly_rate else None,
            'adherence_percent': float(check_in_item.adherence_percent) if check_in_item.adherence_percent else None,
        })

    return Response({
        'count': len(results),
        'results': results,
    }, status=status.HTTP_200_OK)
