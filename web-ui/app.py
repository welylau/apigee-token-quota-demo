#!/usr/bin/env python3
"""
Apigee LLM Token Quota & AI Governance Demo - Web UI Backend
Provides simulation runner, token exhaustion demo, and multidimensional analytics.
"""

import os
import time
import json
import sqlite3
import datetime
import subprocess
from flask import Flask, request, jsonify, send_from_directory, make_response
import requests

app = Flask(__name__, static_folder='static', static_url_path='')

@app.after_request
def add_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Configuration
APIGEE_HOST = os.environ.get("APIGEE_HOST", "YOUR_APIGEE_GATEWAY_HOST")
GATEWAY_URL = os.environ.get("APIGEE_GATEWAY_URL", f"https://{APIGEE_HOST}/gemini-token-limit-demo/")
APIGEE_ORG = os.environ.get("APIGEE_ORG", "YOUR_APIGEE_ORG")
APIGEE_ENV = os.environ.get("APIGEE_ENV", "default-dev")
DEV_EMAIL = os.environ.get("APIGEE_DEV_EMAIL", "developer@example.com")
PORT = int(os.environ.get("PORT", 8089))
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "transactions.db")

# Pre-configured Apps matching YOUR_APIGEE_ORG deployment
APPS = {
    "Gemini-Basic-Mfg-SmartTV-App": {
        "name": "Gemini-Basic-Mfg-SmartTV-App",
        "displayName": "Smart TV App",
        "tier": "Silver",
        "product": "Gemini-Silver-Tier",
        "quotaLimit": 4000,
        "quotaWindowMinutes": 5,
        "apiKey": "YOUR_SMART_TV_APP_API_KEY",
        "department": "Manufacturing",
        "subDepartment": "Smart TV division",
        "badgeColor": "silver",
        "role": "Edge Client",
        "description": "Smart TV embedded firmware client (Basic Tier)"
    },
    "Gemini-Basic-Mfg-AudioSignal-App": {
        "name": "Gemini-Basic-Mfg-AudioSignal-App",
        "displayName": "Audio Signal App",
        "tier": "Silver",
        "product": "Gemini-Silver-Tier",
        "quotaLimit": 4000,
        "quotaWindowMinutes": 5,
        "apiKey": "YOUR_AUDIO_SIGNAL_APP_API_KEY",
        "department": "Manufacturing",
        "subDepartment": "AudioSignal division",
        "badgeColor": "silver",
        "role": "Edge Client",
        "description": "Audio signal DSP processing client (Basic Tier)"
    },
    "Gemini-Premium-Network-Core-App": {
        "name": "Gemini-Premium-Network-Core-App",
        "displayName": "Network Core App",
        "tier": "Gold",
        "product": "Gemini-Gold-Tier",
        "quotaLimit": 40000,
        "quotaWindowMinutes": 5,
        "apiKey": "YOUR_NETWORK_CORE_APP_API_KEY",
        "department": "Network",
        "subDepartment": "Core division",
        "badgeColor": "gold",
        "role": "Enterprise Backend",
        "description": "Core 5G routing & network automation (Premium Tier)"
    },
    "Gemini-Premium-Network-Wireless-App": {
        "name": "Gemini-Premium-Network-Wireless-App",
        "displayName": "Network Wireless App",
        "tier": "Gold",
        "product": "Gemini-Gold-Tier",
        "quotaLimit": 40000,
        "quotaWindowMinutes": 5,
        "apiKey": "YOUR_NETWORK_WIRELESS_APP_API_KEY",
        "department": "Network",
        "subDepartment": "Wireless division",
        "badgeColor": "gold",
        "role": "Enterprise Backend",
        "description": "RAN Wireless access network optimizer (Premium Tier)"
    }
}

def init_db_schema(conn):
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            app_name TEXT NOT NULL,
            api_product TEXT NOT NULL,
            tier TEXT NOT NULL,
            department TEXT NOT NULL,
            sub_department TEXT NOT NULL,
            prompt TEXT,
            response_text TEXT,
            status_code INTEGER NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            candidates_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            latency_ms REAL DEFAULT 0,
            is_quota_exceeded BOOLEAN DEFAULT 0,
            error_message TEXT
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON transactions(timestamp)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_app_name ON transactions(app_name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_product ON transactions(api_product)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_department ON transactions(department)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_department ON transactions(sub_department)")
    conn.commit()

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'")
    if not cursor.fetchone():
        init_db_schema(conn)
    return conn

def init_db():
    with get_db_connection() as conn:
        init_db_schema(conn)

def seed_historical_data(force=False):
    """Seeds realistic historical transactions across the last 7 days."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM transactions WHERE timestamp < datetime('now', '-1 hour')")
        row = cursor.fetchone()
        if not force and row and row['cnt'] >= 30:
            return

        if force:
            cursor.execute("DELETE FROM transactions")
            conn.commit()

        now = datetime.datetime.utcnow()
        import random
        random.seed(42)

        app_keys = [
            'Gemini-Basic-Mfg-SmartTV-App',
            'Gemini-Basic-Mfg-AudioSignal-App',
            'Gemini-Premium-Network-Core-App',
            'Gemini-Premium-Network-Wireless-App'
        ]

        prompts_pool = {
            'Gemini-Basic-Mfg-SmartTV-App': [
                'Diagnose HDMI-eARC audio passthrough failure on Model X900 TV',
                'Optimize 4K HDR10+ dynamic metadata tone mapping curve',
                'Analyze smart TV kernel crash logs during video decoder buffer overflow',
                'Verify Dolby Vision color profile calibration for 120Hz gaming mode'
            ],
            'Gemini-Basic-Mfg-AudioSignal-App': [
                'Design IIR digital biquad filter for 48kHz audio noise suppression',
                'Compute FFT spectrum analysis for acoustic echo cancellation',
                'Analyze THD+N distortion harmonics on stereo DAC output',
                'Synthesize binaural 3D spatial audio HRTF transfer function'
            ],
            'Gemini-Premium-Network-Core-App': [
                'Evaluate 5G Standalone network slice SLA under 100Gbps traffic surge',
                'Analyze UPF packet forwarding latency and eBPF kernel offload metrics',
                'Auto-scale Kubernetes control plane pods for AMF and SMF functions',
                'Validate GTP-U tunnel encap/decap overhead during edge cloud handover'
            ],
            'Gemini-Premium-Network-Wireless-App': [
                'Generate OpenRAN beamforming precoding matrix for 64T64R massive MIMO',
                'Predict cellular handover failure probability using RF signal quality metrics',
                'Optimize millimeter-wave beam steering angles for high-speed rail transit',
                'Analyze sub-6GHz carrier aggregation throughput under high interference'
            ]
        }

        days_config = [
            (7, 14), (6, 16), (5, 18), (4, 22), (3, 26), (2, 32), (1, 36)
        ]

        rows_to_insert = []
        for days_ago, count in days_config:
            for _ in range(count):
                hour = random.randint(1, 23)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                ts = (now - datetime.timedelta(days=days_ago)).replace(hour=hour, minute=minute, second=second).strftime('%Y-%m-%d %H:%M:%S')
                app_name = random.choice(app_keys)
                app_info = APPS[app_name]
                prompt = random.choice(prompts_pool[app_name])
                is_violation = (app_info['tier'] == 'Silver' and random.random() < 0.12)
                if is_violation:
                    status_code = 429
                    p_tok, c_tok, t_tok = 0, 0, 0
                    latency_ms = round(random.uniform(180, 320), 1)
                    resp_text = "HTTP 429 Quota Exceeded: policies.ratelimit.QuotaViolation"
                    err_msg = f"Quota exceeded for product {app_info['product']}. Limit: 4000 tokens per 5 minutes."
                else:
                    status_code = 200
                    p_tok = random.randint(15, 50)
                    c_tok = random.randint(600, 1800) if app_info['tier'] == 'Silver' else random.randint(1000, 2600)
                    t_tok = p_tok + c_tok
                    latency_ms = round(random.uniform(2200, 5100), 1)
                    resp_text = f"Analyzed telemetry for {prompt} with Gemini 2.5 Flash on asia-southeast1."
                    err_msg = ""
                rows_to_insert.append((
                    ts, app_name, app_info['product'], app_info['tier'],
                    app_info['department'], app_info['subDepartment'],
                    prompt, resp_text, status_code, p_tok, c_tok, t_tok,
                    latency_ms, is_violation, err_msg
                ))

        # Today between 24h ago and 1h ago: 22 calls
        for _ in range(22):
            hours_ago = random.uniform(1.2, 23.5)
            ts = (now - datetime.timedelta(hours=hours_ago)).strftime('%Y-%m-%d %H:%M:%S')
            app_name = random.choice(app_keys)
            app_info = APPS[app_name]
            prompt = random.choice(prompts_pool[app_name])
            is_violation = (app_info['tier'] == 'Silver' and random.random() < 0.1)
            if is_violation:
                status_code = 429
                p_tok, c_tok, t_tok = 0, 0, 0
                latency_ms = round(random.uniform(180, 320), 1)
                resp_text = "HTTP 429 Quota Exceeded: policies.ratelimit.QuotaViolation"
                err_msg = f"Quota exceeded for product {app_info['product']}. Limit: 4000 tokens per 5 minutes."
            else:
                status_code = 200
                p_tok = random.randint(15, 50)
                c_tok = random.randint(600, 1800) if app_info['tier'] == 'Silver' else random.randint(1000, 2600)
                t_tok = p_tok + c_tok
                latency_ms = round(random.uniform(2200, 5100), 1)
                resp_text = f"Analyzed telemetry for {prompt} with Gemini 2.5 Flash on asia-southeast1."
                err_msg = ""
            rows_to_insert.append((
                ts, app_name, app_info['product'], app_info['tier'],
                app_info['department'], app_info['subDepartment'],
                prompt, resp_text, status_code, p_tok, c_tok, t_tok,
                latency_ms, is_violation, err_msg
            ))

        # Baseline within last 1 hour: 3 calls
        for m in [35, 20, 8]:
            ts = (now - datetime.timedelta(minutes=m)).strftime('%Y-%m-%d %H:%M:%S')
            app_name = random.choice(app_keys)
            app_info = APPS[app_name]
            prompt = random.choice(prompts_pool[app_name])
            status_code = 200
            p_tok = random.randint(15, 30)
            c_tok = random.randint(700, 1200)
            t_tok = p_tok + c_tok
            latency_ms = round(random.uniform(2800, 4900), 1)
            resp_text = f"Analyzed telemetry for {prompt} with Gemini 2.5 Flash on asia-southeast1."
            err_msg = ""
            rows_to_insert.append((
                ts, app_name, app_info['product'], app_info['tier'],
                app_info['department'], app_info['subDepartment'],
                prompt, resp_text, status_code, p_tok, c_tok, t_tok,
                latency_ms, False, err_msg
            ))

        cursor.executemany("""
            INSERT INTO transactions (
                timestamp, app_name, api_product, tier, department, sub_department,
                prompt, response_text, status_code, prompt_tokens, candidates_tokens,
                total_tokens, latency_ms, is_quota_exceeded, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, rows_to_insert)
        conn.commit()

def generate_timeline(transactions, duration, now):
    """Generates continuous, zero-filled time buckets for the given duration."""
    if duration == "1h":
        num_buckets = 12
        step_minutes = 5
        buckets = []
        for i in range(num_buckets - 1, -1, -1):
            dt = now - datetime.timedelta(minutes=i * step_minutes)
            minute = (dt.minute // 5) * 5
            dt_floor = dt.replace(minute=minute, second=0, microsecond=0)
            key = dt_floor.strftime("%Y-%m-%d %H:%M")
            label = dt_floor.strftime("%H:%M")
            buckets.append({"key": key, "label": label, "requests": 0, "violations_429": 0, "total_tokens": 0})

        for tx in transactions:
            try:
                tx_dt = datetime.datetime.strptime(tx["timestamp"], "%Y-%m-%d %H:%M:%S")
                minute = (tx_dt.minute // 5) * 5
                tx_floor = tx_dt.replace(minute=minute, second=0, microsecond=0).strftime("%Y-%m-%d %H:%M")
                for b in buckets:
                    if b["key"] == tx_floor:
                        b["requests"] += 1
                        if tx["status_code"] == 429:
                            b["violations_429"] += 1
                        b["total_tokens"] += tx["total_tokens"]
                        break
            except Exception:
                pass
        return buckets

    elif duration == "1d":
        num_buckets = 24
        buckets = []
        for i in range(num_buckets - 1, -1, -1):
            dt = now - datetime.timedelta(hours=i)
            dt_floor = dt.replace(minute=0, second=0, microsecond=0)
            key = dt_floor.strftime("%Y-%m-%d %H:00")
            label = dt_floor.strftime("%H:00")
            buckets.append({"key": key, "label": label, "requests": 0, "violations_429": 0, "total_tokens": 0})

        for tx in transactions:
            try:
                tx_dt = datetime.datetime.strptime(tx["timestamp"], "%Y-%m-%d %H:%M:%S")
                tx_floor = tx_dt.replace(minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:00")
                for b in buckets:
                    if b["key"] == tx_floor:
                        b["requests"] += 1
                        if tx["status_code"] == 429:
                            b["violations_429"] += 1
                        b["total_tokens"] += tx["total_tokens"]
                        break
            except Exception:
                pass
        return buckets

    elif duration == "3d":
        num_buckets = 12
        step_hours = 6
        buckets = []
        for i in range(num_buckets - 1, -1, -1):
            dt = now - datetime.timedelta(hours=i * step_hours)
            hour_floor = (dt.hour // 6) * 6
            dt_floor = dt.replace(hour=hour_floor, minute=0, second=0, microsecond=0)
            key = dt_floor.strftime("%Y-%m-%d %H:00")
            label = dt_floor.strftime("%m-%d %H:00")
            buckets.append({"key": key, "label": label, "requests": 0, "violations_429": 0, "total_tokens": 0})

        for tx in transactions:
            try:
                tx_dt = datetime.datetime.strptime(tx["timestamp"], "%Y-%m-%d %H:%M:%S")
                hour_floor = (tx_dt.hour // 6) * 6
                tx_floor = tx_dt.replace(hour=hour_floor, minute=0, second=0, microsecond=0).strftime("%Y-%m-%d %H:00")
                for b in buckets:
                    if b["key"] == tx_floor:
                        b["requests"] += 1
                        if tx["status_code"] == 429:
                            b["violations_429"] += 1
                        b["total_tokens"] += tx["total_tokens"]
                        break
            except Exception:
                pass
        return buckets

    else: # 7d
        num_buckets = 7
        buckets = []
        for i in range(num_buckets - 1, -1, -1):
            dt = now - datetime.timedelta(days=i)
            key = dt.strftime("%Y-%m-%d")
            label = dt.strftime("%m-%d")
            buckets.append({"key": key, "label": label, "requests": 0, "violations_429": 0, "total_tokens": 0})

        for tx in transactions:
            try:
                tx_dt = datetime.datetime.strptime(tx["timestamp"], "%Y-%m-%d %H:%M:%S")
                tx_day = tx_dt.strftime("%Y-%m-%d")
                for b in buckets:
                    if b["key"] == tx_day:
                        b["requests"] += 1
                        if tx["status_code"] == 429:
                            b["violations_429"] += 1
                        b["total_tokens"] += tx["total_tokens"]
                        break
            except Exception:
                pass
        return buckets

init_db()
seed_historical_data()

def get_app_rolling_tokens(app_name):
    """Calculates tokens used in the last 5 minutes for the given app and checks exhaustion status."""
    five_min_ago = (datetime.datetime.utcnow() - datetime.timedelta(minutes=5)).strftime('%Y-%m-%d %H:%M:%S')
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COALESCE(SUM(total_tokens), 0) as used_tokens,
                   COUNT(CASE WHEN status_code = 429 THEN 1 END) as quota_violations,
                   COUNT(*) as total_calls
            FROM transactions
            WHERE app_name = ? AND timestamp >= ?
        """, (app_name, five_min_ago))
        row = cursor.fetchone()
        used = row['used_tokens'] if row else 0
        violations = row['quota_violations'] if row else 0
        calls = row['total_calls'] if row else 0

        # Check most recent call status in this window
        cursor.execute("""
            SELECT status_code FROM transactions
            WHERE app_name = ? AND timestamp >= ?
            ORDER BY id DESC LIMIT 1
        """, (app_name, five_min_ago))
        latest_row = cursor.fetchone()
        latest_is_429 = (latest_row and latest_row['status_code'] == 429)

        return used, violations, calls, latest_is_429

def execute_apigee_request(app_info, prompt_text):
    """Sends a request to Apigee gateway, parses tokens, and records to DB."""
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt_text}]
            }
        ]
    }
    headers = {
        "Content-Type": "application/json",
        "x-api-key": app_info["apiKey"]
    }

    start_time = time.time()
    try:
        resp = requests.post(
            GATEWAY_URL,
            json=payload,
            headers=headers,
            verify=False,
            timeout=45
        )
        latency_ms = round((time.time() - start_time) * 1000, 2)
        status_code = resp.status_code
        try:
            resp_json = resp.json()
        except Exception:
            resp_json = {"raw": resp.text}
    except Exception as e:
        latency_ms = round((time.time() - start_time) * 1000, 2)
        status_code = 500
        resp_json = {"error": {"message": str(e), "code": 500, "status": "CLIENT_ERROR"}}

    now_utc = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    prompt_tokens = 0
    candidates_tokens = 0
    total_tokens = 0
    response_text = ""
    is_quota_exceeded = (status_code == 429)
    error_message = ""

    if status_code == 200:
        usage = resp_json.get("usageMetadata", {})
        prompt_tokens = usage.get("promptTokenCount", 0)
        candidates_tokens = usage.get("candidatesTokenCount", 0)
        total_tokens = usage.get("totalTokenCount", 0)
        candidates = resp_json.get("candidates", [])
        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
            response_text = candidates[0]["content"]["parts"][0].get("text", "")
    else:
        err = resp_json.get("error", {})
        error_message = err.get("message", resp.text if 'resp' in locals() else "Unknown Error")
        if status_code == 429:
            response_text = f"HTTP 429 Quota Exceeded: {error_message}"

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (
                timestamp, app_name, api_product, tier, department, sub_department,
                prompt, response_text, status_code, prompt_tokens, candidates_tokens,
                total_tokens, latency_ms, is_quota_exceeded, error_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            now_utc, app_info["name"], app_info["product"], app_info["tier"],
            app_info["department"], app_info["subDepartment"],
            prompt_text, response_text, status_code, prompt_tokens, candidates_tokens,
            total_tokens, latency_ms, is_quota_exceeded, error_message
        ))
        conn.commit()
        tx_id = cursor.lastrowid

    used_tokens, violations, calls, latest_is_429 = get_app_rolling_tokens(app_info["name"])
    quota_limit = app_info["quotaLimit"]
    is_exhausted = is_quota_exceeded or latest_is_429 or (used_tokens >= quota_limit) or (violations > 0)
    
    # If exhausted, effective remaining tokens is 0
    remaining_tokens = 0 if is_exhausted else max(0, quota_limit - used_tokens)
    pct_used = 100.0 if is_exhausted else round(min(100.0, (used_tokens / quota_limit) * 100), 1)

    return {
        "id": tx_id,
        "timestamp": now_utc,
        "appName": app_info["name"],
        "displayName": app_info["displayName"],
        "tier": app_info["tier"],
        "product": app_info["product"],
        "department": app_info["department"],
        "subDepartment": app_info["subDepartment"],
        "statusCode": status_code,
        "latencyMs": latency_ms,
        "prompt": prompt_text,
        "responseText": response_text,
        "response": response_text,
        "promptTokens": prompt_tokens,
        "candidatesTokens": candidates_tokens,
        "totalTokens": total_tokens,
        "isQuotaExceeded": is_quota_exceeded,
        "errorMessage": error_message,
        "error": error_message,
        "rollingUsage": {
            "usedTokens": used_tokens,
            "quotaLimit": quota_limit,
            "remainingTokens": remaining_tokens,
            "percentageUsed": pct_used,
            "violations": violations,
            "violationsInWindow": violations,
            "calls": calls,
            "callsInWindow": calls,
            "status": "EXHAUSTED" if is_exhausted else "ACTIVE",
            "isExhausted": is_exhausted
        },
        "rollingWindow": {
            "usedTokens": used_tokens,
            "quotaLimit": quota_limit,
            "remainingTokens": remaining_tokens,
            "percentageUsed": pct_used,
            "violations": violations,
            "violationsInWindow": violations,
            "calls": calls,
            "callsInWindow": calls,
            "status": "EXHAUSTED" if is_exhausted else "ACTIVE",
            "isExhausted": is_exhausted
        }
    }

# --- Routes ---

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/config", methods=["GET"])
def get_config():
    """Returns gateway, org, and application configuration with current usage."""
    apps_list = []
    for k, v in APPS.items():
        used_tokens, violations, calls, latest_is_429 = get_app_rolling_tokens(k)
        app_data = dict(v)
        quota_limit = v["quotaLimit"]
        is_exhausted = latest_is_429 or (used_tokens >= quota_limit) or (violations > 0)
        remaining = 0 if is_exhausted else max(0, quota_limit - used_tokens)
        pct_used = 100.0 if is_exhausted else round(min(100.0, (used_tokens / quota_limit) * 100), 1)

        app_data["apiKeyMasked"] = v["apiKey"][:6] + "..." + v["apiKey"][-4:]
        app_data["rollingUsage"] = {
            "usedTokens": used_tokens,
            "remainingTokens": remaining,
            "percentageUsed": pct_used,
            "isExhausted": is_exhausted,
            "violations": violations,
            "calls": calls,
            "status": "EXHAUSTED" if is_exhausted else "ACTIVE"
        }
        apps_list.append(app_data)

    return jsonify({
        "gatewayUrl": GATEWAY_URL,
        "org": APIGEE_ORG,
        "env": APIGEE_ENV,
        "targetModel": "gemini-2.5-flash (asia-southeast1)",
        "apps": apps_list
    })

@app.route("/api/chat", methods=["POST"])
def chat():
    """Executes a single prompt for a selected application."""
    data = request.get_json() or {}
    app_name = data.get("appName")
    prompt_text = data.get("prompt", "Summarize AI API quota governance in 2 sentences.")

    if not app_name or app_name not in APPS:
        return jsonify({"error": f"Invalid or missing appName. Available: {list(APPS.keys())}"}), 400

    app_info = APPS[app_name]
    result = execute_apigee_request(app_info, prompt_text)
    return jsonify(result)

@app.route("/api/burst", methods=["POST"])
def burst_simulation():
    """Executes multiple rapid requests in a loop to demonstrate quota exhaustion."""
    data = request.get_json() or {}
    app_name = data.get("appName")
    count = int(data.get("count", 4))
    prompt_preset = data.get("promptPreset", "heavy")
    custom_prompt = data.get("customPrompt")

    if not app_name or app_name not in APPS:
        return jsonify({"error": f"Invalid or missing appName. Available: {list(APPS.keys())}"}), 400

    app_info = APPS[app_name]

    preset_prompts = {
        "light": "Write a 1-sentence definition of API quota.",
        "medium": "Write a 3-paragraph summary of 5G network architecture and edge computing.",
        "heavy": "Write a comprehensive, detailed 500-word essay explaining the history of telecommunications and television broadcasting from 1920 to 2026."
    }

    prompt_to_use = custom_prompt if custom_prompt else preset_prompts.get(prompt_preset, preset_prompts["heavy"])

    steps = []
    quota_exhausted_at = None

    for i in range(1, count + 1):
        step_result = execute_apigee_request(app_info, f"[Call {i}/{count}] {prompt_to_use}")
        steps.append({
            "step": i,
            "totalSteps": count,
            "result": step_result
        })

        if step_result["isQuotaExceeded"] or step_result["statusCode"] == 429:
            quota_exhausted_at = i
            break
        time.sleep(0.3)

    final_window = steps[-1]["result"]["rollingWindow"] if steps else None

    formatted_steps = []
    for s in steps:
        res = s.get("result", {})
        formatted_steps.append({
            "step": s.get("step"),
            "callIndex": s.get("step"),
            "statusCode": res.get("statusCode", 200),
            "tokens": res.get("totalTokens", 0),
            "latencyMs": res.get("latencyMs", 0),
            "summary": f"{res.get('totalTokens', 0)} tokens" if res.get("statusCode") == 200 else res.get("errorMessage", "Quota Exceeded"),
            "result": res
        })

    return jsonify({
        "appName": app_name,
        "displayName": app_info["displayName"],
        "tier": app_info["tier"],
        "quotaLimit": app_info["quotaLimit"],
        "requestedCalls": count,
        "executedCalls": len(steps),
        "quotaExhausted": quota_exhausted_at is not None,
        "quotaExhaustedAtCall": quota_exhausted_at,
        "steps": formatted_steps,
        "rollingWindow": final_window,
        "rollingUsage": final_window,
        "finalRollingUsage": final_window,
        "summary": f"Exhausted quota at call #{quota_exhausted_at} (HTTP 429 RESOURCE_EXHAUSTED)" if quota_exhausted_at else f"Successfully executed all {count} calls without exceeding {app_info['tier']} tier quota!"
    })

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    """Returns analytics filtered by duration: 1h, 1d, 3d, 7d."""
    duration = request.args.get("duration", "1h")
    source = request.args.get("source", "live")

    now = datetime.datetime.utcnow()
    durations_map = {
        "1h": datetime.timedelta(hours=1),
        "1d": datetime.timedelta(days=1),
        "3d": datetime.timedelta(days=3),
        "7d": datetime.timedelta(days=7)
    }
    delta = durations_map.get(duration, datetime.timedelta(hours=1))
    start_time = (now - delta).strftime('%Y-%m-%d %H:%M:%S')

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Overall KPIs
        cursor.execute("""
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status_code = 200 THEN 1 END) as success_requests,
                COUNT(CASE WHEN status_code = 429 THEN 1 END) as quota_violations,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(prompt_tokens), 0) as total_prompt_tokens,
                COALESCE(SUM(candidates_tokens), 0) as total_candidates_tokens,
                COALESCE(AVG(CASE WHEN status_code = 200 THEN latency_ms END), 0) as avg_latency_ms
            FROM transactions
            WHERE timestamp >= ?
        """, (start_time,))
        kpis = dict(cursor.fetchone())
        total_reqs = kpis["total_requests"]
        kpis["quota_violation_rate"] = round((kpis["quota_violations"] / total_reqs * 100), 1) if total_reqs > 0 else 0
        kpis["avg_latency_ms"] = round(kpis["avg_latency_ms"], 1)

        # 2. Breakdown by API Product
        cursor.execute("""
            SELECT 
                api_product,
                tier,
                COUNT(*) as requests,
                COUNT(CASE WHEN status_code = 429 THEN 1 END) as violations_429,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(candidates_tokens), 0) as candidates_tokens
            FROM transactions
            WHERE timestamp >= ?
            GROUP BY api_product, tier
            ORDER BY total_tokens DESC
        """, (start_time,))
        by_product = [dict(row) for row in cursor.fetchall()]

        # 3. Breakdown by Developer App
        cursor.execute("""
            SELECT 
                app_name,
                api_product,
                tier,
                department,
                sub_department,
                COUNT(*) as requests,
                COUNT(CASE WHEN status_code = 429 THEN 1 END) as violations_429,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(candidates_tokens), 0) as candidates_tokens
            FROM transactions
            WHERE timestamp >= ?
            GROUP BY app_name, api_product, tier, department, sub_department
            ORDER BY total_tokens DESC
        """, (start_time,))
        by_app = [dict(row) for row in cursor.fetchall()]

        # 4. Breakdown by Department
        cursor.execute("""
            SELECT 
                department,
                COUNT(*) as requests,
                COUNT(CASE WHEN status_code = 429 THEN 1 END) as violations_429,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(candidates_tokens), 0) as candidates_tokens
            FROM transactions
            WHERE timestamp >= ?
            GROUP BY department
            ORDER BY total_tokens DESC
        """, (start_time,))
        by_department = [dict(row) for row in cursor.fetchall()]

        # 5. Breakdown by Sub-Department
        cursor.execute("""
            SELECT 
                sub_department,
                department,
                COUNT(*) as requests,
                COUNT(CASE WHEN status_code = 429 THEN 1 END) as violations_429,
                COALESCE(SUM(total_tokens), 0) as total_tokens,
                COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
                COALESCE(SUM(candidates_tokens), 0) as candidates_tokens
            FROM transactions
            WHERE timestamp >= ?
            GROUP BY sub_department, department
            ORDER BY total_tokens DESC
        """, (start_time,))
        by_sub_department = [dict(row) for row in cursor.fetchall()]

        # 6. Timeline series
        cursor.execute("""
            SELECT timestamp, status_code, total_tokens
            FROM transactions
            WHERE timestamp >= ?
            ORDER BY timestamp ASC
        """, (start_time,))
        timeline_rows = [dict(row) for row in cursor.fetchall()]
        timeline = generate_timeline(timeline_rows, duration, now)

        # 7. Recent Transactions (strictly filtered by duration window)
        cursor.execute("""
            SELECT * FROM transactions
            WHERE timestamp >= ?
            ORDER BY timestamp DESC, id DESC
            LIMIT 100
        """, (start_time,))
        recent_txs = [dict(row) for row in cursor.fetchall()]

    duration_labels = {
        "1h": "Last 1 Hour",
        "1d": "Last 1 Day",
        "3d": "Last 3 Days",
        "7d": "Last 7 Days"
    }

    apigee_cloud_data = None
    if source in ["apigee", "unified"]:
        apigee_cloud_data = fetch_apigee_cloud_stats(duration)

    return jsonify({
        "duration": duration,
        "durationLabel": duration_labels.get(duration, "Last 1 Hour"),
        "startTime": start_time,
        "endTime": now.strftime('%Y-%m-%d %H:%M:%S'),
        "totalTxCount": len(recent_txs),
        "kpis": kpis,
        "byProduct": by_product,
        "byApp": by_app,
        "byDepartment": by_department,
        "bySubDepartment": by_sub_department,
        "timeline": timeline,
        "recentTransactions": recent_txs,
        "apigeeCloudStats": apigee_cloud_data
    })

def fetch_apigee_cloud_stats(duration):
    """Fetches real Apigee stats API metrics from BigQuery backend."""
    token = None
    try:
        token_cmd = subprocess.run(
            ["gcloud", "auth", "print-access-token", "--account", DEV_EMAIL],
            capture_output=True, text=True, check=True
        )
        token = token_cmd.stdout.strip()
    except Exception:
        try:
            meta_resp = requests.get(
                "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
                headers={"Metadata-Flavor": "Google"}, timeout=2
            )
            token = meta_resp.json().get("access_token")
        except Exception:
            token = None

    if not token:
        return {"status": "ERROR", "message": "Unable to acquire Google Cloud authentication token."}

    try:
        now = datetime.datetime.utcnow()
        durations_days = {"1h": 1, "1d": 1, "3d": 3, "7d": 7}
        days = durations_days.get(duration, 1)
        start_date = (now - datetime.timedelta(days=days)).strftime('%m/%d/%Y 00:00')
        end_date = (now + datetime.timedelta(days=1)).strftime('%m/%d/%Y 23:59')
        time_range = f"{start_date}~{end_date}"

        headers = {"Authorization": f"Bearer {token}"}
        base_stats_url = f"https://apigee.googleapis.com/v1/organizations/{APIGEE_ORG}/environments/{APIGEE_ENV}/stats"

        p_resp = requests.get(
            f"{base_stats_url}/api_product?select=sum(message_count),sum(dc_ai_total_token_count)&timeRange={time_range}",
            headers=headers, timeout=10
        )
        d_resp = requests.get(
            f"{base_stats_url}/dc_department?select=sum(message_count),sum(dc_ai_total_token_count)&timeRange={time_range}",
            headers=headers, timeout=10
        )
        s_resp = requests.get(
            f"{base_stats_url}/dc_sub_department?select=sum(message_count),sum(dc_ai_total_token_count),sum(dc_ai_prompt_token_count),sum(dc_ai_response_token_count)&timeRange={time_range}",
            headers=headers, timeout=10
        )
        a_resp = requests.get(
            f"{base_stats_url}/developer_app?select=sum(message_count),sum(dc_ai_total_token_count)&timeRange={time_range}",
            headers=headers, timeout=10
        )

        return {
            "status": "SUCCESS",
            "timeRange": time_range,
            "apiProduct": p_resp.json() if p_resp.status_code == 200 else None,
            "developerApp": a_resp.json() if a_resp.status_code == 200 else None,
            "department": d_resp.json() if d_resp.status_code == 200 else None,
            "subDepartment": s_resp.json() if s_resp.status_code == 200 else None
        }
    except Exception as e:
        return {
            "status": "ERROR",
            "message": str(e)
        }

@app.route("/api/reset-session", methods=["POST"])
def reset_session():
    """Clears live test traffic and restores the 7-day demo baseline."""
    seed_historical_data(force=True)
    return jsonify({"status": "SUCCESS", "message": "Demo session ledger reset to default 7-day demo baseline."})

if __name__ == "__main__":
    print(f"🚀 Starting Apigee LLM Token Quota Demo Web UI on http://localhost:{PORT}")
    print(f"🔗 Target Apigee Gateway: {GATEWAY_URL}")
    print(f"🏢 Org: {APIGEE_ORG}, Env: {APIGEE_ENV}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
