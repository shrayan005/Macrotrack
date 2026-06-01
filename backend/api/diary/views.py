# FILE: api/diary/views.py
# PURPOSE: Function-based views for water logs and daily notes endpoints.
# USED BY: api/views.py (re-exporter), api/urls.py
# KEY FUNCTIONS:
#   daily_note_detail — GET/POST/PUT for a date's diary note (upsert)
#   water_logs        — GET daily total + POST new water entry
#   water_log_detail  — DELETE a specific water entry
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import logging

# Import models from sub-packages
from api.diary.models import DailyNote, WaterLog

# Import serializer from sub-package
from api.diary.serializers import DailyNoteSerializer

logger = logging.getLogger(__name__)

def validate_date_string(date_string):
    """
    Validate and parse a date string in YYYY-MM-DD format.

    Args:
        date_string: The date string to validate

    Returns:
        The date string unchanged if valid

    Raises:
        ValueError: If the format is wrong
    """
    from datetime import datetime
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
        return date_string
    except ValueError:
        raise ValueError(f"Invalid date format: {date_string}. Expected YYYY-MM-DD")

def error_response(message, status_code=status.HTTP_400_BAD_REQUEST, **extra_fields):
    """Standardized error response format."""
    error_data = {'error': message}
    error_data.update(extra_fields)
    return Response(error_data, status=status_code)

# DAILY NOTES
@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])  # Only logged-in users can access their diary notes
def daily_note_detail(request):
    """
    Get, create, or update a daily note for a specific date.

    This endpoint uses an upsert pattern: POST creates a note,
    but if one already exists for that date it updates it instead.

    Query Params (GET):
        date (str): YYYY-MM-DD format (required)

    Body Params (POST/PUT):
        date (str): YYYY-MM-DD format (required)
        tags (list): List of strings e.g. ["Traveling", "Sick"]
        note_text (str): Optional free-text journaling
        activity_level (str): 'rest', 'light', 'moderate', 'active'
    """
    # Handle GET request — return the note for the given date
    if request.method == 'GET':
        date_str = request.GET.get('date')
        if not date_str:
            return Response(
                {'error': 'Date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_date_string(date_str)
        except ValueError as e:
            return error_response(str(e))

        try:
            note = DailyNote.objects.get(user=request.user, date=date_str)
            serializer = DailyNoteSerializer(note)
            return Response(serializer.data)
        except DailyNote.DoesNotExist:
            # Return 200 with null — "no note" is a valid state, not an error
            return Response(
                {'date': date_str, 'note': None},
                status=status.HTTP_200_OK
            )

    # Handle POST/PUT request — upsert (create or update) the note
    elif request.method in ['POST', 'PUT']:
        date_str = request.data.get('date')
        if not date_str:
            return Response(
                {'error': 'Date is required in body'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_date_string(date_str)
        except ValueError as e:
            return error_response(str(e))

        # Try to find existing note for this date
        is_create = False
        try:
            note = DailyNote.objects.get(user=request.user, date=date_str)
            # Note exists — update it (partial=True allows updating only some fields)
            serializer = DailyNoteSerializer(note, data=request.data, partial=True, context={'request': request})
        except DailyNote.DoesNotExist:
            # No note yet — create a new one
            serializer = DailyNoteSerializer(data=request.data, context={'request': request})
            is_create = True

        if serializer.is_valid():
            serializer.save()
            # Return 201 for new creation, 200 for update
            status_code = status.HTTP_201_CREATED if is_create else status.HTTP_200_OK
            return Response(serializer.data, status=status_code)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# WATER LOGS
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def water_logs(request):
    """
    Two operations on one URL depending on the HTTP method:

    GET  /api/water-logs/?date=YYYY-MM-DD
        Returns the total ml drunk today + a list of individual log entries.
        The dashboard uses this to fill the water progress bar.
        Example response:
            { "total_ml": 1250, "entries": [{"id": 1, "amount_ml": 500}, ...] }

    POST /api/water-logs/
        Logs a new water intake entry.
        Body: { "amount_ml": 250, "date": "2026-04-01" }
        The Dashboard calls this when the user clicks +250ml / +500ml / +750ml.
        Example response:
            { "id": 5, "amount_ml": 250 }

    NOTE: Water entries are NOT aggregated into a single row per day.
          Each button click creates a NEW row. The daily total is computed
          by summing all rows at query time (see GET above).
          To undo a specific entry use DELETE /api/water-logs/<id>/.
    """
    from datetime import date as date_type

    if request.method == 'GET':
        # Default to today if no ?date= param provided
        date_str = request.GET.get('date', str(date_type.today()))

        # Fetch every water log entry this user has for the given date
        logs = WaterLog.objects.filter(user=request.user, date=date_str)

        # Sum all entry amounts to get the daily total (e.g. 500 + 250 + 500 = 1250)
        total = sum(log_entry.amount_ml for log_entry in logs)

        # Return both the total and the individual entries (entries allow deletion)
        entries = [{'id': log_entry.id, 'amount_ml': log_entry.amount_ml} for log_entry in logs]
        return Response({'total_ml': total, 'entries': entries})

    # ── POST — log a new water intake ──────────────────────────────────────
    amount = request.data.get('amount_ml')
    if not amount:
        return Response({'error': 'amount_ml is required'}, status=status.HTTP_400_BAD_REQUEST)

    # Validate: must be a positive whole number (no floats, no negatives)
    try:
        amount = int(amount)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'amount_ml must be a positive integer'}, status=status.HTTP_400_BAD_REQUEST)

    # If no date provided, default to today
    date_str = request.data.get('date', str(date_type.today()))

    # Create a new row in the WaterLog table for this user + date + amount
    entry = WaterLog.objects.create(user=request.user, date=date_str, amount_ml=amount)
    return Response({'id': entry.id, 'amount_ml': entry.amount_ml}, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def water_log_detail(request, log_id):
    """
    DELETE /api/water-logs/<id>/

    Removes a single water log entry by its ID.
    The user can only delete their own entries — get_object_or_404 enforces
    this by filtering on both id AND user in one query.
    If either doesn't match → 404 (not 403, to avoid revealing existence of others' data).

    Returns 204 No Content on success (nothing to send back after deletion).
    """
    # get_object_or_404 verifies both existence AND ownership in one call
    entry = get_object_or_404(WaterLog, id=log_id, user=request.user)
    entry.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
