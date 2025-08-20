#!/bin/bash
set -euo pipefail

# Ensure jq exists
if ! command -v jq >/dev/null 2>&1; then
	echo "❌ 'jq' is required. Please install jq and re-run." >&2
	exit 1
fi

# Load env from common places (do not commit these files)
for CAND in ".env" ".env.local" "mercado-pago-serverless/.env.local"; do
	if [[ -f "$CAND" ]]; then
		# shellcheck disable=SC2046
		export $(grep -v '^#' "$CAND" | xargs)
	fi
done

# Derive Twilio CLI creds from either TWILIO_* or app vars
TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-${ACCOUNT_SID:-}}"
TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-${AUTH_TOKEN:-}}"

if [[ -z "${TWILIO_ACCOUNT_SID:-}" || -z "${TWILIO_AUTH_TOKEN:-}" ]]; then
	echo "❌ Missing Twilio credentials. Set ACCOUNT_SID/AUTH_TOKEN or TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN in your env." >&2
	exit 1
fi

mkdir -p .env-temp
ENV_FILE=".env-temp/templates.env"
: > "$ENV_FILE"

echo "Uploading templates…"
for file in content-templates/*.json; do
	FRIENDLY=$(basename "$file" .json)
	NAME=$(echo "$FRIENDLY" | tr 'a-z' 'A-Z')
	echo "→ Creating content: $NAME"

	# Create content as JSON
	CREATE_RESP=$(curl -sS -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
		-H "Content-Type: application/json" \
		-H "Accept: application/json" \
		--data-binary @"$file" \
		https://content.twilio.com/v1/Content)

	SID=$(echo "$CREATE_RESP" | jq -r '.sid // empty')
	if [[ -z "$SID" || "$SID" == "null" ]]; then
		echo "❌ Failed to create content for $NAME"
		echo "$CREATE_RESP"
		exit 1
	fi
	echo "   SID: $SID"

	# Build approval name: <lowercased sid>_<friendly-slug>
	SLUG=$(echo "$FRIENDLY" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/_/g; s/^_+|_+$//g')
	SID_LC=$(echo "$SID" | tr '[:upper:]' '[:lower:]')
	APPROVAL_NAME="${SID_LC}_${SLUG}"

	# Submit WhatsApp approval (lowercase path; JSON body)
	APPROVAL_URL="https://content.twilio.com/v1/Content/${SID}/ApprovalRequests/whatsapp"
	APPROVE_RESP=$(curl -sS -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
		-H "Content-Type: application/json" \
		-H "Accept: application/json" \
		-X POST "$APPROVAL_URL" \
		-d "{\"name\":\"$APPROVAL_NAME\",\"category\":\"UTILITY\"}")

	echo "   Approval response: $APPROVE_RESP"

	# Map file → env var key
	if [[ "$NAME" == "PIX" ]]; then
		echo "PAYMENT_CONTENT_SID=$SID" >> "$ENV_FILE"
	elif [[ "$NAME" == "CARD" ]]; then
		echo "CREDIT_CARD_CONTENT_SID=$SID" >> "$ENV_FILE"
	elif [[ "$NAME" == "STATUS" ]]; then
		echo "ORDER_STATUS_CONTENT_SID=$SID" >> "$ENV_FILE"
	fi
done

echo "✅ Wrote template SIDs to $ENV_FILE"