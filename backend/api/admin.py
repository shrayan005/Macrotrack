# FILE: api/admin.py
# PURPOSE: Django Admin registrations for all MacroTrack models.
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Sum, Avg
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Food, Meal, MealFood, WeightLog, DailyNote, UserCheckIn, WaterLog, ExerciseLog, Recipe

class MealFoodInline(admin.TabularInline):
    """Inline for editing meal foods"""
    model = MealFood
    extra = 0
    readonly_fields = ['calories', 'protein', 'carbs', 'fat']
    fields = ['food', 'serving_size', 'serving_unit', 'serving_grams', 'calories', 'protein', 'carbs', 'fat', 'source']
    autocomplete_fields = ['food']

@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    """Enhanced Food admin with verification and popularity tracking"""

    list_display = ['name', 'source_badge', 'category', 'nutrition_summary', 'popularity_score',
                    'is_verified', 'search_count', 'created_at']
    list_filter = ['source', 'is_verified', 'category', 'created_at']
    search_fields = ['name', 'fdc_id', 'category']
    ordering = ['-search_count', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'search_count', 'usage_stats']
    actions = ['verify_foods', 'unverify_foods', 'reset_search_count']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Basic Info', {'fields': ('name', 'fdc_id', 'source', 'category', 'serving_description')}),
        ('Nutrition (per 100g)', {'fields': ('calories', 'protein', 'carbs', 'fat', 'fiber')}),
        ('Metadata', {'fields': ('created_by', 'is_verified', 'search_count')}),
        ('Usage Statistics', {'fields': ('usage_stats',), 'classes': ('collapse',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def source_badge(self, obj):
        """Display source as colored badge"""
        colors = {
            'fatsecret': '#4CAF50',
            'custom': '#FF9800',
            'manual': '#9C27B0'
        }
        color = colors.get(obj.source.lower(), '#999')
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{}</span>',
            color, obj.source.upper()
        )
    source_badge.short_description = 'Source'

    def nutrition_summary(self, obj):
        """Display nutrition as compact summary"""
        return format_html(
            '<div style="font-size: 11px; line-height: 1.4;">'
            '<strong>{}</strong> kcal<br>'
            'P: {}g | C: {}g | F: {}g'
            '</div>',
            obj.calories or 0, obj.protein or 0, obj.carbs or 0, obj.fat or 0
        )
    nutrition_summary.short_description = 'Nutrition'

    def popularity_score(self, obj):
        """Calculate and display popularity"""
        count = obj.search_count or 0
        if count > 100:
            level = 'High'
            color = '#4CAF50'
        elif count > 20:
            level = 'Medium'
            color = '#FF9800'
        else:
            level = 'Low'
            color = '#999'

        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span> ({})',
            color, level, count
        )
    popularity_score.short_description = 'Popularity'

    def get_queryset(self, request):
        """Annotate queryset to avoid N+1 queries in list display"""
        qs = super().get_queryset(request)
        qs = qs.annotate(
            _meal_count=Count('meal_foods', distinct=True),
            _unique_users=Count('meal_foods__meal__user', distinct=True),
            _avg_serving=Avg('meal_foods__serving_grams'),
        )
        return qs

    def usage_stats(self, obj):
        """Display detailed usage statistics (uses annotated values)"""
        meal_count = getattr(obj, '_meal_count', 0)
        unique_users = getattr(obj, '_unique_users', 0)

        stats = [
            f"Total Uses: {meal_count}",
            f"Unique Users: {unique_users}",
            f"Search Count: {obj.search_count or 0}",
        ]

        avg_serving = getattr(obj, '_avg_serving', None)
        if meal_count > 0 and avg_serving is not None:
            stats.append(f"Avg Serving: {avg_serving:.1f}g")

        return format_html('<br>'.join(stats))
    usage_stats.short_description = 'Usage Statistics'

    # Custom actions
    def verify_foods(self, request, queryset):
        """Mark selected foods as verified"""
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} foods verified.')
    verify_foods.short_description = 'Verify selected foods'

    def unverify_foods(self, request, queryset):
        """Remove verification from selected foods"""
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'{updated} foods unverified.')
    unverify_foods.short_description = 'Unverify selected foods'

    def reset_search_count(self, request, queryset):
        """Reset search count to zero"""
        updated = queryset.update(search_count=0)
        self.message_user(request, f'Search count reset for {updated} foods.')
    reset_search_count.short_description = 'Reset search count'

@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    """Enhanced Meal admin with inline food editing"""

    list_display = ['user_link', 'meal_type_badge', 'date', 'time', 'food_count',
                    'nutrition_summary_compact', 'created_at']
    list_filter = ['meal_type', 'date', 'user']
    search_fields = ['user__email', 'user__username', 'notes']
    ordering = ['-date', '-time', '-created_at']
    readonly_fields = ['total_calories', 'total_protein', 'total_carbs', 'total_fat',
                       'nutrition_breakdown', 'created_at', 'updated_at']
    date_hierarchy = 'date'
    inlines = [MealFoodInline]
    actions = ['calculate_nutrition_totals']

    fieldsets = (
        ('Meal Info', {'fields': ('user', 'meal_type', 'date', 'time')}),
        ('Nutrition Totals', {'fields': ('total_calories', 'total_protein', 'total_carbs', 'total_fat')}),
        ('Detailed Breakdown', {'fields': ('nutrition_breakdown',), 'classes': ('collapse',)}),
        ('Notes', {'fields': ('notes',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def user_link(self, obj):
        """Link to user's admin page"""
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'

    def meal_type_badge(self, obj):
        """Display meal type as badge"""
        colors = {
            'breakfast': '#FFB84D',
            'lunch': '#4CAF50',
            'dinner': '#2196F3',
            'snack': '#9C27B0'
        }
        color = colors.get(obj.meal_type.lower(), '#999')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color, obj.meal_type.title()
        )
    meal_type_badge.short_description = 'Type'

    def food_count(self, obj):
        """Count of foods in meal"""
        return obj.meal_foods.count()
    food_count.short_description = 'Foods'

    def nutrition_summary_compact(self, obj):
        """Compact nutrition display"""
        return format_html(
            '<div style="font-size: 11px;">'
            '<strong>{}</strong> kcal | P: {}g | C: {}g | F: {}g'
            '</div>',
            obj.total_calories or 0, obj.total_protein or 0,
            obj.total_carbs or 0, obj.total_fat or 0
        )
    nutrition_summary_compact.short_description = 'Nutrition'

    def nutrition_breakdown(self, obj):
        """Detailed nutrition breakdown per food"""
        foods = obj.meal_foods.all()
        if not foods:
            return "No foods in this meal"

        breakdown = ['<table style="width: 100%; border-collapse: collapse;">']
        breakdown.append(
            '<tr style="background: #f5f5f5; font-weight: bold;">'
            '<th style="padding: 8px; text-align: left;">Food</th>'
            '<th style="padding: 8px; text-align: right;">Serving</th>'
            '<th style="padding: 8px; text-align: right;">Cal</th>'
            '<th style="padding: 8px; text-align: right;">P</th>'
            '<th style="padding: 8px; text-align: right;">C</th>'
            '<th style="padding: 8px; text-align: right;">F</th>'
            '</tr>'
        )

        for mf in foods:
            breakdown.append(
                f'<tr style="border-bottom: 1px solid #eee;">'
                f'<td style="padding: 8px;">{mf.food.name}</td>'
                f'<td style="padding: 8px; text-align: right;">{mf.serving_size} {mf.serving_unit}</td>'
                f'<td style="padding: 8px; text-align: right;">{mf.calories or 0:.0f}</td>'
                f'<td style="padding: 8px; text-align: right;">{mf.protein or 0:.1f}g</td>'
                f'<td style="padding: 8px; text-align: right;">{mf.carbs or 0:.1f}g</td>'
                f'<td style="padding: 8px; text-align: right;">{mf.fat or 0:.1f}g</td>'
                f'</tr>'
            )

        breakdown.append('</table>')
        return mark_safe(''.join(breakdown))
    nutrition_breakdown.short_description = 'Food Breakdown'

    def calculate_nutrition_totals(self, request, queryset):
        """Recalculate nutrition totals for selected meals"""
        count = 0
        for meal in queryset:
            foods = meal.meal_foods.all()
            meal.total_calories = sum(f.calories or 0 for f in foods)
            meal.total_protein = sum(f.protein or 0 for f in foods)
            meal.total_carbs = sum(f.carbs or 0 for f in foods)
            meal.total_fat = sum(f.fat or 0 for f in foods)
            meal.save()
            count += 1
        self.message_user(request, f'Recalculated nutrition for {count} meals.')
    calculate_nutrition_totals.short_description = 'Recalculate nutrition totals'

@admin.register(MealFood)
class MealFoodAdmin(admin.ModelAdmin):
    """Admin interface for MealFood model"""

    list_display = ['meal', 'food', 'serving_size', 'serving_unit', 'calories', 'protein', 'carbs', 'fat', 'source']
    list_filter = ['source', 'serving_unit', 'meal__meal_type']
    search_fields = ['food__name', 'meal__user__email']
    ordering = ['-created_at']
    readonly_fields = ['calories', 'protein', 'carbs', 'fat', 'created_at']

    fieldsets = (
        ('Meal & Food', {'fields': ('meal', 'food')}),
        ('Serving Info', {'fields': ('serving_size', 'serving_unit', 'serving_grams')}),
        ('Calculated Nutrition', {'fields': ('calories', 'protein', 'carbs', 'fat')}),
        ('Timestamps', {'fields': ('created_at',)}),
    )

@admin.register(WeightLog)
class WeightLogAdmin(admin.ModelAdmin):
    """Enhanced WeightLog admin with trend analysis"""

    list_display = ['user_link', 'weight_display', 'date', 'weight_change', 'days_since_last', 'created_at']
    list_filter = ['date', 'user']
    search_fields = ['user__email', 'user__username', 'notes']
    ordering = ['-date', '-created_at']
    readonly_fields = ['created_at', 'updated_at', 'weight_trend_analysis']
    date_hierarchy = 'date'
    actions = ['flag_outliers']

    fieldsets = (
        ('Weight Entry', {'fields': ('user', 'weight', 'date')}),
        ('Trend Analysis', {'fields': ('weight_trend_analysis',), 'classes': ('collapse',)}),
        ('Notes', {'fields': ('notes',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def user_link(self, obj):
        """Link to user's admin page"""
        url = reverse('admin:accounts_user_change', args=[obj.user.pk])
        return format_html('<a href="{}">{}</a>', url, obj.user.email)
    user_link.short_description = 'User'

    def weight_display(self, obj):
        """Display weight with unit"""
        return format_html('<strong>{}</strong> kg', f"{obj.weight:.1f}")
    weight_display.short_description = 'Weight'

    def weight_change(self, obj):
        """Show weight change from previous entry"""
        prev = WeightLog.objects.filter(
            user=obj.user,
            date__lt=obj.date
        ).order_by('-date').first()

        if not prev:
            return format_html('<span style="color: #999;">First entry</span>')

        change = obj.weight - prev.weight
        color = '#4CAF50' if change < 0 else '#F44336' if change > 0 else '#999'
        arrow = '▼' if change < 0 else '▲' if change > 0 else '='

        return format_html(
            '<span style="color: {};">{} {} kg</span>',
            color, arrow, f"{abs(change):.1f}"
        )
    weight_change.short_description = 'Change'

    def days_since_last(self, obj):
        """Days since previous weight log"""
        prev = WeightLog.objects.filter(
            user=obj.user,
            date__lt=obj.date
        ).order_by('-date').first()

        if not prev:
            return '-'

        days = (obj.date - prev.date).days
        if days == 1:
            return '1 day'
        return f'{days} days'
    days_since_last.short_description = 'Since Last'

    def weight_trend_analysis(self, obj):
        """Display weight trend analysis"""
        logs = WeightLog.objects.filter(user=obj.user).order_by('date')

        if logs.count() < 2:
            return "Not enough data for trend analysis"

        first = logs.first()
        last = logs.last()
        total_change = last.weight - first.weight
        days = (last.date - first.date).days

        stats = [
            f"<strong>Overall Progress</strong>",
            f"First Weight: {first.weight:.1f} kg on {first.date}",
            f"Current Weight: {obj.weight:.1f} kg",
            f"Total Change: {total_change:+.1f} kg",
        ]

        if days > 0:
            weekly_rate = (total_change / days) * 7
            stats.append(f"Average Rate: {weekly_rate:+.2f} kg/week")

        # Recent trend (last 4 entries)
        recent = list(logs.order_by('-date')[:4])
        if len(recent) >= 2:
            recent_change = recent[0].weight - recent[-1].weight
            stats.append(f"<br><strong>Recent Trend (Last {len(recent)} Entries)</strong>")
            stats.append(f"Change: {recent_change:+.1f} kg")

        return format_html('<br>'.join(stats))
    weight_trend_analysis.short_description = 'Weight Trend'

    def flag_outliers(self, request, queryset):
        """Flag potentially incorrect weight entries (outliers)"""
        flagged = 0
        for log in queryset:
            # Check if weight is unrealistic (< 30kg or > 300kg)
            if log.weight < 30 or log.weight > 300:
                self.message_user(
                    request,
                    f'Outlier: {log.user.email} - {log.weight}kg on {log.date}',
                    level='warning'
                )
                flagged += 1

        if flagged == 0:
            self.message_user(request, 'No outliers detected.')
    flag_outliers.short_description = 'Flag outlier weights'

# Check if DailyNote and UserCheckIn models exist and register them
try:
    @admin.register(DailyNote)
    class DailyNoteAdmin(admin.ModelAdmin):
        """Admin interface for DailyNote model"""
        list_display = ['user', 'date', 'note_preview', 'created_at']
        list_filter = ['date', 'user']
        search_fields = ['user__email', 'note_text']
        ordering = ['-date']
        date_hierarchy = 'date'

        def note_preview(self, obj):
            """Show note preview"""
            text = obj.note_text or ""
            return text[:50] + '...' if len(text) > 50 else text
        note_preview.short_description = 'Note'
except:
    pass

try:
    @admin.register(UserCheckIn)
    class UserCheckInAdmin(admin.ModelAdmin):
        """Admin interface for UserCheckIn model"""
        list_display = ['user', 'date', 'reflection', 'weight_at_checkin', 'calorie_target_after', 'created_at']
        list_filter = ['date', 'reflection', 'accepted_adjustment']
        search_fields = ['user__email']
        ordering = ['-date']
        date_hierarchy = 'date'
except:
    pass

@admin.register(WaterLog)
class WaterLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'amount_ml', 'created_at']
    list_filter = ['date', 'user']
    search_fields = ['user__email']
    ordering = ['-created_at']
    date_hierarchy = 'date'

@admin.register(ExerciseLog)
class ExerciseLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'exercise_name', 'date', 'duration_minutes', 'calories_burned', 'created_at']
    list_filter = ['date', 'user']
    search_fields = ['user__email', 'exercise_name']
    ordering = ['-date', '-created_at']
    date_hierarchy = 'date'

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'calories', 'protein', 'carbs', 'fat', 'serving_description', 'created_at']
    list_filter = ['user']
    search_fields = ['user__email', 'name']
    ordering = ['-created_at']