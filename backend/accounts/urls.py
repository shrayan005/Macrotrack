# FILE: accounts/urls.py
# PURPOSE: URL patterns for accounts: register, login, logout, profile, password reset.
from django.urls import path
from . import views

app_name = "accounts"

urlpatterns = [
    path("signup/", views.signup, name="signup"),
    path("login/", views.login, name="login"),
    path("google/", views.google_auth, name="google_auth"),
    path("logout/", views.logout, name="logout"),
    path("profile/", views.user_profile, name="profile"),
    path("profile/update/", views.update_profile, name="update_profile"),
    path("stats/", views.account_stats, name="account_stats"),
    path("delete-account/", views.delete_account, name="delete_account"),
    path("password-reset/request/", views.password_reset_request, name="password_reset_request"),
    path("password-reset/verify-otp/", views.password_reset_verify_otp, name="password_reset_verify_otp"),
    path("password-reset/confirm/", views.password_reset_confirm, name="password_reset_confirm"),
    path("verify-email/", views.verify_email, name="verify_email"),
    path("resend-verification/", views.resend_verification, name="resend_verification"),
    path("profile/upload-picture/", views.upload_profile_picture, name="upload_profile_picture"),
]