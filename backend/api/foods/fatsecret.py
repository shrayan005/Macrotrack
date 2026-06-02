# FILE: api/foods/fatsecret.py
# PURPOSE: Lightweight FatSecret API client for food search only.
#          Searches FatSecret's database, caches results locally so
#          repeated searches hit the DB instead of the API.
import hashlib
import hmac
import time
import uuid
import logging
import requests
from urllib.parse import quote, urlencode

from django.conf import settings

logger = logging.getLogger(__name__)

FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api'


def _sign(params, consumer_secret):
    """Build OAuth 1.0 signature for FatSecret."""
    sorted_params = sorted(params.items())
    param_str = '&'.join(f"{quote(str(k), safe='')}={quote(str(v), safe='')}" for k, v in sorted_params)
    base = f"POST&{quote(FATSECRET_API_URL, safe='')}&{quote(param_str, safe='')}"
    sig_key = f"{quote(consumer_secret, safe='')}&"
    return hmac.new(sig_key.encode(), base.encode(), hashlib.sha1).digest()


def search_fatsecret(query, max_results=25):
    """
    Search FatSecret for foods matching `query`.
    Returns a list of dicts with name/calories/protein/carbs/fat per 100g,
    or an empty list if credentials are missing or the call fails.
    """
    import base64

    consumer_key    = getattr(settings, 'FATSECRET_CONSUMER_KEY', None)
    consumer_secret = getattr(settings, 'FATSECRET_CONSUMER_SECRET', None)

    if not consumer_key or not consumer_secret:
        return []

    params = {
        'method':           'foods.search',
        'search_expression': query,
        'format':           'json',
        'max_results':      max_results,
        'oauth_consumer_key':     consumer_key,
        'oauth_nonce':            uuid.uuid4().hex,
        'oauth_signature_method': 'HMAC-SHA1',
        'oauth_timestamp':        str(int(time.time())),
        'oauth_version':          '1.0',
    }

    sig_bytes = _sign(params, consumer_secret)
    params['oauth_signature'] = base64.b64encode(sig_bytes).decode()

    try:
        resp = requests.post(FATSECRET_API_URL, data=params, timeout=8)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        logger.warning("FatSecret search failed for '%s': %s", query, e)
        return []

    foods_raw = data.get('foods', {}).get('food', [])
    if isinstance(foods_raw, dict):
        foods_raw = [foods_raw]

    results = []
    for f in foods_raw:
        desc = f.get('food_description', '')
        nutrients = _parse_description(desc)
        if nutrients is None:
            continue
        results.append({
            'fatsecret_id':      f.get('food_id'),
            'name':              f.get('food_name', ''),
            'calories':          nutrients['calories'],
            'protein':           nutrients['protein'],
            'carbs':             nutrients['carbs'],
            'fat':               nutrients['fat'],
            'serving_description': nutrients.get('serving', '100g'),
            'source':            'fatsecret',
        })
    return results


def _parse_description(desc):
    """
    Parse FatSecret food_description like:
    'Per 100g - Calories: 165kcal | Fat: 3.57g | Carbs: 0g | Protein: 31.02g'
    Returns dict or None on parse failure.
    """
    try:
        parts = {}
        serving = '100g'
        if ' - ' in desc:
            serving_part, rest = desc.split(' - ', 1)
            serving = serving_part.replace('Per ', '').strip()
        else:
            rest = desc

        for segment in rest.split('|'):
            segment = segment.strip()
            if ':' in segment:
                key, val = segment.split(':', 1)
                val = val.strip().lower().replace('kcal', '').replace('g', '').strip()
                try:
                    parts[key.strip().lower()] = float(val)
                except ValueError:
                    pass

        return {
            'calories': parts.get('calories', 0),
            'protein':  parts.get('protein', 0),
            'carbs':    parts.get('carbs', parts.get('carbohydrates', 0)),
            'fat':      parts.get('fat', 0),
            'serving':  serving,
        }
    except Exception:
        return None
