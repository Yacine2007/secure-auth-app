import requests
import time
import json
import random

# ==================== CONFIGURATION ====================
API_BASE = 'https://b-y-pro-acounts-login.onrender.com'
JSONBIN_BIN_ID = '69c12accaa77b81da90ed823'
JSONBIN_API_KEY = '$2a$10$yDHSLnhevrj04WsUtdi5RuwB9snZKOu3JCacq9f4Hrn9BGD9ZNjhK'
JSONBIN_ACCESS_KEY = 'B.Y PRO App'
JSONBIN_URL = f'https://api.jsonbin.io/v3/b/{JSONBIN_BIN_ID}'
INTERNAL_API_KEY = 'bypro-internal-key-2025'  # يجب أن يكون نفس الموجود في env

# ==================== FUNCTIONS ====================

def make_request(method, url, max_retries=3, **kwargs):
    """إرسال طلب مع إعادة المحاولة"""
    for attempt in range(max_retries):
        try:
            response = requests.request(method, url, timeout=30, **kwargs)
            if response.status_code in [200, 201]:
                return response
            print(f"⚠️ Attempt {attempt + 1} failed: HTTP {response.status_code}")
            if attempt < max
