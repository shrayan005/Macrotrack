# FILE: accounts/admin.py
# PURPOSE: Django Admin registrations for the CustomUser model.
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.db.models import Count, Avg, Max
from .models import User, EmailVerificationOTP, PasswordResetOTP

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Enhanced User admin with nutrition tracking and statistics"""

    list_display = ['email', 'username', 'display_name', 'goal_display', 'activity_badge',
                    'meal_count', 'weight_logs_count', 'is_staff', 'is_active', 'date_joined']
    list_filter = ['is_staff', 'is_active', 'auth_provider', 'goal', 'activity_level', 'gender']
    search_fields = ['email', 'username', 'display_name', 'google_id']
    ordering = ['-date_joined']
    readonly_fields = ['account_stats', 'nutrition_summary', 'last_login', 'date_joined']
    actions = ['activate_users', 'deactivate_users', 'reset_nutrition_targets']

    fieldsets = (
        (None, {'fields': ('email', 'username', 'password')}),
        ('Personal Info', {'fields': ('display_name', 'bio', 'age', 'gender')}),
        ('Physical Stats', {'fields': ('height', 'weight', 'goal_weight')}),
        ('Goals & Nutrition', {'fields': (
            'goal', 'rate', 'activity_level',
            'calorie_target', 'protein_target', 'carbs_target', 'fat_target', 'macro_preset'
        )}),
        ('OAuth', {'fields': ('google_id', 'auth_provider')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Statistics', {'fields': ('account_stats', 'nutrition_summary'), 'classes': ('collapse',)}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'password1', 'password2'),
        }),
    )

    def goal_display(self, obj):
        """Display goal with color coding"""
        colors = {'lose': '#FF6B6B', 'gain': '#4ECDC4', 'maintain': '#95E1D3'}
        goal_text = obj.goal.title() if obj.goal else 'Not Set'
        color = colors.get(obj.goal, '#999')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color, goal_text
        )
    goal_display.short_description = 'Goal'

    def activity_badge(self, obj):
        """Display activity level as badge"""
        levels = {
            'sedentary': ('Sedentary', '#999'),
            'lightly': ('Light', '#FFD93D'),
            'moderately': ('Moderate', '#6BCB77'),
            'very': ('Very Active', '#4D96FF')
        }
        text, color = levels.get(obj.activity_level, ('Unknown', '#999'))
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color, text
        )
    activity_badge.short_description = 'Activity'

    def meal_count(self, obj):
        """Count of meals logged"""
        return obj.meals.count()
    meal_count.short_description = 'Meals'
    meal_count.admin_order_field = 'meals__count'

    def weight_logs_count(self, obj):
        """Count of weight logs"""
        return obj.weight_logs.count()
    weight_logs_count.short_description = 'Weights'
    weight_logs_count.admin_order_field = 'weight_logs__count'

    def account_stats(self, obj):
        """Display comprehensive account statistics"""
        from django.utils.timezone import now
        from datetime import timedelta

        stats = []

        # Total meals
        total_meals = obj.meals.count()
        stats.append(f"Total Meals Logged: {total_meals}")

        # Meals in last 7 days
        week_ago = now() - timedelta(days=7)
        recent_meals = obj.meals.filter(created_at__gte=week_ago).count()
        stats.append(f"Meals (Last 7 Days): {recent_meals}")

        # Weight logs
        total_weights = obj.weight_logs.count()
        stats.append(f"Weight Logs: {total_weights}")

        # Weight progress
        if total_weights >= 2:
            first_weight = obj.weight_logs.order_by('date').first()
            last_weight = obj.weight_logs.order_by('-date').first()
            change = last_weight.weight - first_weight.weight
            stats.append(f"Weight Change: {change:+.1f} kg")

        # Image analyses
        image_count = obj.food_image_analyses.count()
        stats.append(f"Images Analyzed: {image_count}")

        # Account age
        age = (now() - obj.date_joined).days
        stats.append(f"Account Age: {age} days")

        return format_html('<br>'.join(stats))
    account_stats.short_description = 'Account Statistics'

    def nutrition_summary(self, obj):
        """Display nutrition targets summary"""
        if not obj.calorie_target:
            return "Not configured"

        protein = obj.protein_target or 0
        carbs = obj.carbs_target or 0
        fat = obj.fat_target or 0

        summary = [
            f"Calories: {obj.calorie_target} kcal/day",
            f"Protein: {protein}g ({protein * 4} kcal)",
            f"Carbs: {carbs}g ({carbs * 4} kcal)",
            f"Fat: {fat}g ({fat * 9} kcal)",
        ]

        # Calculate macro percentages
        total_macro_cals = (protein * 4) + (carbs * 4) + (fat * 9)
        if total_macro_cals > 0:
            p_pct = (protein * 4 / total_macro_cals) * 100
            c_pct = (carbs * 4 / total_macro_cals) * 100
            f_pct = (fat * 9 / total_macro_cals) * 100
            summary.append(f"<br><strong>Macro Split:</strong> {p_pct:.0f}% P / {c_pct:.0f}% C / {f_pct:.0f}% F")

        return format_html('<br>'.join(summary))
    nutrition_summary.short_description = 'Nutrition Targets'

    def get_queryset(self, request):
        """Optimize queryset with prefetch"""
        qs = super().get_queryset(request)
        return qs.annotate(
            meals__count=Count('meals', distinct=True),
            weight_logs__count=Count('weight_logs', distinct=True)
        )

    # Custom actions
    def activate_users(self, request, queryset):
        """Activate selected users"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} users activated.')
    activate_users.short_description = 'Activate selected users'

    def deactivate_users(self, request, queryset):
        """Deactivate selected users"""
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} users deactivated.')
    deactivate_users.short_description = 'Deactivate selected users'

    def reset_nutrition_targets(self, request, queryset):
        """Reset nutrition targets to defaults"""
        updated = queryset.update(
            calorie_target=2000,
            protein_target=150,
            carbs_target=200,
            fat_target=65
        )
        self.message_user(request, f'Nutrition targets reset for {updated} users.')
    reset_nutrition_targets.short_description = 'Reset nutrition targets to defaults'

@admin.register(EmailVerificationOTP)
class EmailVerificationOTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'otp', 'created_at', 'expires_at', 'attempts', 'is_used']
    readonly_fields = ['user', 'otp', 'created_at', 'expires_at', 'attempts', 'is_used']

@admin.register(PasswordResetOTP)
class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'otp', 'created_at', 'expires_at', 'attempts', 'is_used', 'reset_token']
    readonly_fields = ['user', 'otp', 'created_at', 'expires_at', 'attempts', 'is_used', 'reset_token', 'reset_token_expires_at']