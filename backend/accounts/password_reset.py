# FILE: accounts/password_reset.py
# PURPOSE: Password reset flow — token generation, email dispatch, and token validation.
"""
Password reset utilities – OTP-based flow
"""
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

# ── Kept for any legacy callers ──────────────────────────────────────────────
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

_token_generator = PasswordResetTokenGenerator()

def generate_reset_token(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = _token_generator.make_token(user)
    return f"{uid}.{token}"

def verify_reset_token(reset_token):
    try:
        uid, token = reset_token.split('.')
        user_pk = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_pk)
        if _token_generator.check_token(user, token):
            return user
        return None
    except (ValueError, User.DoesNotExist, TypeError, OverflowError):
        return None
# ─────────────────────────────────────────────────────────────────────────────

def send_otp_email(user, otp: str) -> bool:
    """
    Send a beautifully formatted HTML email containing the 6-digit OTP.

    Args:
        user: User instance
        otp:  The plain 6-digit OTP string

    Returns:
        True on success, False on failure
    """
    name = user.display_name or user.username or "there"
    expiry_minutes = 10
    subject = "Your MacroTrack Password Reset Code"

    # ── Plain-text fallback ──────────────────────────────────────────────────
    text_body = (
        f"Hi {name},\n\n"
        f"You requested a password reset for your MacroTrack account.\n\n"
        f"Your verification code is:\n\n"
        f"    {otp}\n\n"
        f"This code expires in {expiry_minutes} minutes.\n\n"
        f"If you did not request this, you can safely ignore this email – "
        f"your password will not change.\n\n"
        f"Stay healthy,\n"
        f"The MacroTrack Team"
    )

    # ── HTML email ───────────────────────────────────────────────────────────
    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MacroTrack Password Reset</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;
             font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
             -webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 20px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:16px;
                    box-shadow:0 8px 32px rgba(0,0,0,0.08);
                    border:1px solid #e5e7eb;overflow:hidden;
                    max-width:480px;width:100%;">

        <!-- Logo row -->
        <tr>
          <td style="padding:40px 48px 0;text-align:center;">
            <p style="margin:0 0 28px;font-size:20px;font-weight:800;
                      letter-spacing:-0.5px;color:#1a1a1a;">
              MACROTRACK
            </p>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:0 48px;text-align:center;">
            <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;
                       color:#1a1a1a;letter-spacing:-0.5px;">
              Password Reset
            </h1>
            <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
              Hi {name}, enter the code below to reset your password.
            </p>
          </td>
        </tr>

        <!-- OTP box -->
        <tr>
          <td style="padding:0 48px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center"
                    style="background:#f9f9f9;border:1px solid #e5e7eb;
                           border-radius:8px;padding:28px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;
                             letter-spacing:2px;text-transform:uppercase;color:#6b7280;">
                    Verification Code
                  </p>
                  <p style="margin:0;font-size:42px;font-weight:800;
                             letter-spacing:12px;color:#1a1a1a;
                             font-family:'Courier New',monospace;">
                    {otp}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Expiry notice -->
        <tr>
          <td style="padding:0 48px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#f9f9f9;border:1px solid #e5e7eb;
                           border-left:4px solid #1a1a1a;border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">
                    This code expires in <strong>{expiry_minutes} minutes</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Steps -->
        <tr>
          <td style="padding:0 48px 24px;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#1a1a1a;">
              How to use this code:
            </p>
            <ol style="margin:0;padding-left:18px;font-size:14px;color:#6b7280;line-height:1.8;">
              <li>Go back to the MacroTrack app</li>
              <li>Enter the 6-digit code shown above</li>
              <li>Create your new password</li>
            </ol>
          </td>
        </tr>

        <!-- Security notice -->
        <tr>
          <td style="padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#f9f9f9;border:1px solid #e5e7eb;
                           border-left:4px solid #6b7280;border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;font-size:13px;font-weight:500;color:#4b5563;line-height:1.5;">
                    <strong>Security notice:</strong> Never share this code with anyone.
                    If you did not request a password reset, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #e5e7eb;
                     padding:20px 48px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
              MacroTrack · Your AI Nutrition Coach
            </p>
            <p style="margin:0;font-size:11px;color:#d1d5db;">
              © 2026 MacroTrack. All rights reserved.
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("OTP email sent to %s", user.email)
        return True
    except Exception as exc:
        logger.error("Failed to send OTP email to %s: %s", user.email, exc)
        return False

def send_verification_email(user, otp: str) -> bool:
    """
    Send a formatted HTML email with the 6-digit OTP for email verification.
    """
    name = user.display_name or user.username or "there"
    expiry_minutes = 10
    subject = "Verify Your MacroTrack Email"

    text_body = (
        f"Hi {name},\n\n"
        f"Welcome to MacroTrack! Please verify your email address.\n\n"
        f"Your verification code is:\n\n"
        f"    {otp}\n\n"
        f"This code expires in {expiry_minutes} minutes.\n\n"
        f"If you did not create a MacroTrack account, you can safely ignore this email.\n\n"
        f"Stay healthy,\n"
        f"The MacroTrack Team"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MacroTrack Email Verification</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;
             font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
             -webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:40px 20px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="480" cellpadding="0" cellspacing="0" border="0"
             style="background:#ffffff;border-radius:16px;
                    box-shadow:0 8px 32px rgba(0,0,0,0.08);
                    border:1px solid #e5e7eb;overflow:hidden;
                    max-width:480px;width:100%;">

        <!-- Logo row -->
        <tr>
          <td style="padding:40px 48px 0;text-align:center;">
            <p style="margin:0 0 28px;font-size:20px;font-weight:800;
                      letter-spacing:-0.5px;color:#1a1a1a;">
              MACROTRACK
            </p>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:0 48px;text-align:center;">
            <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;
                       color:#1a1a1a;letter-spacing:-0.5px;">
              Verify Your Email
            </h1>
            <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
              Welcome to MacroTrack! Hi {name}, enter the code below to activate your account.
            </p>
          </td>
        </tr>

        <!-- OTP box -->
        <tr>
          <td style="padding:0 48px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center"
                    style="background:#f9f9f9;border:1px solid #e5e7eb;
                           border-radius:8px;padding:28px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;
                             letter-spacing:2px;text-transform:uppercase;color:#6b7280;">
                    Verification Code
                  </p>
                  <p style="margin:0;font-size:42px;font-weight:800;
                             letter-spacing:12px;color:#1a1a1a;
                             font-family:'Courier New',monospace;">
                    {otp}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Expiry notice -->
        <tr>
          <td style="padding:0 48px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#f9f9f9;border:1px solid #e5e7eb;
                           border-left:4px solid #1a1a1a;border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;font-size:13px;font-weight:600;color:#1a1a1a;">
                    This code expires in <strong>{expiry_minutes} minutes</strong>.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Security notice -->
        <tr>
          <td style="padding:0 48px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:#f9f9f9;border:1px solid #e5e7eb;
                           border-left:4px solid #6b7280;border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;font-size:13px;font-weight:500;color:#4b5563;line-height:1.5;">
                    If you did not create a MacroTrack account, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;border-top:1px solid #e5e7eb;
                     padding:20px 48px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
              MacroTrack · Your AI Nutrition Coach
            </p>
            <p style="margin:0;font-size:11px;color:#d1d5db;">
              © 2026 MacroTrack. All rights reserved.
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>

</body>
</html>"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        logger.info("Verification email sent to user %s", user.id)
        return True
    except Exception as exc:
        logger.error("Failed to send verification email to user %s: %s", user.id, exc)
        return False

# Keep old plain-text helper name as alias so nothing breaks
def send_password_reset_email(user, reset_url):
    """Legacy helper – sends a plain-text reset-link email (kept for backward compat)."""
    subject = "Reset Your MacroTrack Password"
    message = (
        f"Hello {user.display_name or user.username},\n\n"
        f"Click the link below to reset your password:\n{reset_url}\n\n"
        f"This link will expire in 24 hours.\n\n"
        f"If you didn't request this, you can safely ignore this email.\n\n"
        f"Best regards,\nThe MacroTrack Team"
    )
    try:
        from django.core.mail import send_mail
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Password reset link email sent to %s", user.email)
        return True
    except Exception as exc:
        logger.error("Failed to send reset link email to %s: %s", user.email, exc)
        return False