#!/usr/bin/env bash
set -e

# ==============================================================================
# Setup Script: Apigee Products & Developer Apps for YOUR_APIGEE_ORG
# ==============================================================================

ORG="${APIGEE_ORG:-YOUR_APIGEE_ORG}"
ENV="${APIGEE_ENV:-default-dev}"
PROXY_NAME="gemini-token-limit-demo"
DEV_EMAIL="${APIGEE_DEV_EMAIL:-developer@example.com}"

echo "=================================================================="
echo "Configuring Apigee Products and Apps for Org: $ORG"
echo "Target Environment: $ENV"
echo "Associated Proxy: $PROXY_NAME"
echo "Developer Email: $DEV_EMAIL"
echo "=================================================================="

TOKEN=$(gcloud auth print-access-token --account "$DEV_EMAIL")
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 1. Ensure Developer Exists
echo ""
echo "👤 Step 1: Checking/Creating Developer ($DEV_EMAIL)..."
apigeecli developers create \
  -n "$DEV_EMAIL" \
  -f "Wely" \
  -s "Lau" \
  -u "developer" \
  -o "$ORG" -t "$TOKEN" 2>/dev/null || echo "   ℹ Developer $DEV_EMAIL already exists."

# 2. Create/Update API Products
echo ""
echo "📦 Step 2: Creating/Updating API Products with LLM Operation Groups..."

echo "   -> Provisioning API Product: Gemini-Silver-Tier (4,000 tokens / 5 mins)..."
curl -s -X POST "https://apigee.googleapis.com/v1/organizations/${ORG}/apiproducts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$DIR/products/Gemini-Silver-Tier.json" 2>/dev/null || \
curl -s -X PUT "https://apigee.googleapis.com/v1/organizations/${ORG}/apiproducts/Gemini-Silver-Tier" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$DIR/products/Gemini-Silver-Tier.json" > /dev/null
echo "   ✔ Gemini-Silver-Tier active."

echo "   -> Provisioning API Product: Gemini-Gold-Tier (40,000 tokens / 5 mins)..."
curl -s -X POST "https://apigee.googleapis.com/v1/organizations/${ORG}/apiproducts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$DIR/products/Gemini-Gold-Tier.json" 2>/dev/null || \
curl -s -X PUT "https://apigee.googleapis.com/v1/organizations/${ORG}/apiproducts/Gemini-Gold-Tier" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @"$DIR/products/Gemini-Gold-Tier.json" > /dev/null
echo "   ✔ Gemini-Gold-Tier active."

# 3. Create Developer Apps
echo ""
echo "📱 Step 3: Creating Developer Apps with Custom Attributes..."

# Silver Tier Apps
echo "   -> Creating App: Gemini-Basic-Mfg-SmartTV-App (Silver Tier)..."
apigeecli apps create \
  --name "Gemini-Basic-Mfg-SmartTV-App" \
  --email "$DEV_EMAIL" \
  --prods "Gemini-Silver-Tier" \
  --attrs Department=Manufacturing \
  --attrs "Sub Department=Smart TV division" \
  -o "$ORG" -t "$TOKEN" 2>/dev/null || echo "   ℹ App already exists."

echo "   -> Creating App: Gemini-Basic-Mfg-AudioSignal-App (Silver Tier)..."
apigeecli apps create \
  --name "Gemini-Basic-Mfg-AudioSignal-App" \
  --email "$DEV_EMAIL" \
  --prods "Gemini-Silver-Tier" \
  --attrs Department=Manufacturing \
  --attrs "Sub Department=AudioSignal division" \
  -o "$ORG" -t "$TOKEN" 2>/dev/null || echo "   ℹ App already exists."

# Gold Tier Apps
echo "   -> Creating App: Gemini-Premium-Network-Core-App (Gold Tier)..."
apigeecli apps create \
  --name "Gemini-Premium-Network-Core-App" \
  --email "$DEV_EMAIL" \
  --prods "Gemini-Gold-Tier" \
  --attrs Department=Network \
  --attrs "Sub Department=Core division" \
  -o "$ORG" -t "$TOKEN" 2>/dev/null || echo "   ℹ App already exists."

echo "   -> Creating App: Gemini-Premium-Network-Wireless-App (Gold Tier)..."
apigeecli apps create \
  --name "Gemini-Premium-Network-Wireless-App" \
  --email "$DEV_EMAIL" \
  --prods "Gemini-Gold-Tier" \
  --attrs Department=Network \
  --attrs "Sub Department=Wireless division" \
  -o "$ORG" -t "$TOKEN" 2>/dev/null || echo "   ℹ App already exists."

echo ""
echo "=================================================================="
echo "✅ Provisioning completed successfully for $ORG!"
echo "=================================================================="
