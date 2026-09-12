#!/usr/bin/env bash
set -e

# ==============================================================================
# Deployment Script for gemini-token-limit-demo in YOUR_APIGEE_ORG
# ==============================================================================

ORG="${APIGEE_ORG:-YOUR_APIGEE_ORG}"
ENV="${APIGEE_ENV:-default-dev}"
PROXY_NAME="gemini-token-limit-demo"
ACCOUNT="${GCP_ACCOUNT:-developer@example.com}"
RUNTIME_SA="${APIGEE_RUNTIME_SA:-sa-apigee-aiservices@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOKEN=$(gcloud auth print-access-token --account "$ACCOUNT")

echo "📦 Uploading API Proxy Bundle '$PROXY_NAME' to Apigee Org '$ORG'..."
apigeecli apis create bundle \
  -n "$PROXY_NAME" \
  -f "$DIR/$PROXY_NAME/apiproxy" \
  -o "$ORG" \
  -t "$TOKEN"

echo ""
echo "🚀 Deploying to environment '$ENV' with Service Account '$RUNTIME_SA'..."
apigeecli apis deploy \
  -n "$PROXY_NAME" \
  -e "$ENV" \
  -s "$RUNTIME_SA" \
  -o "$ORG" \
  --ovr \
  --wait \
  -t "$TOKEN"

echo ""
echo "✅ Deployment complete and READY in $ORG / $ENV!"
