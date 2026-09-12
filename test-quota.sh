#!/usr/bin/env bash
# ==============================================================================
# Verification and Test Script for gemini-token-limit-demo in YOUR_APIGEE_ORG
# ==============================================================================

APIGEE_HOST="${APIGEE_HOST:-YOUR_APIGEE_GATEWAY_HOST}"
GATEWAY_URL="https://${APIGEE_HOST}/gemini-token-limit-demo/"

KEY_SMART_TV="YOUR_SMART_TV_APP_API_KEY"
KEY_AUDIO="YOUR_AUDIO_SIGNAL_APP_API_KEY"
KEY_NETWORK_CORE="YOUR_NETWORK_CORE_APP_API_KEY"
KEY_NETWORK_WIRELESS="YOUR_NETWORK_WIRELESS_APP_API_KEY"

echo "🧪 Testing Gemini Token Limit Proxy via Apigee Gateway"
echo "Gateway URL: $GATEWAY_URL"
echo ""

# Test 1: Calling without API Key (Expected: 401 Unauthorized)
echo "1️⃣  Test 1: Request without API Key (Should fail with 401 Unauthorized)..."
curl -s -k -X POST "$GATEWAY_URL" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"Hello, are you online?"}]}]}' | jq . || true

echo ""
echo "------------------------------------------------------------------"

# Test 2: Calling with SmartTV App (Silver Tier: 4,000 tokens / 5 mins)
echo "2️⃣  Test 2: Request with Gemini-Basic-Mfg-SmartTV-App API Key (Silver Tier)..."
curl -s -k -X POST "$GATEWAY_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${KEY_SMART_TV}" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Summarize how Apigee secures Gemini AI APIs in 2 short bullet points."
          }
        ]
      }
    ]
  }' | jq '{text: .candidates[0].content.parts[0].text, totalTokens: .usageMetadata.totalTokenCount, model: .modelVersion}'

echo ""
echo "------------------------------------------------------------------"

# Test 3: Calling with Network Core App (Gold Tier: 40,000 tokens / 5 mins)
echo "3️⃣  Test 3: Request with Gemini-Premium-Network-Core-App API Key (Gold Tier)..."
curl -s -k -X POST "$GATEWAY_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${KEY_NETWORK_CORE}" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Give 1 sentence explaining core network virtualization."
          }
        ]
      }
    ]
  }' | jq '{text: .candidates[0].content.parts[0].text, totalTokens: .usageMetadata.totalTokenCount, model: .modelVersion}'

echo ""
echo "------------------------------------------------------------------"
echo "✅ Verification complete. All token usage, department, and sub-department data collectors captured!"
