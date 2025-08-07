set -e

cd mercado-pago-serverless

ENV_FILE=".env"
> "$ENV_FILE"

# Required environment vars
cat <<EOF >> $ENV_FILE
ACCOUNT_SID=$ACCOUNT_SID
AUTH_TOKEN=$AUTH_TOKEN
MERCADO_PAGO_ACCESS_TOKEN=$MERCADO_PAGO_ACCESS_TOKEN
WHATSAPP_FROM_NUMBER=$WHATSAPP_FROM_NUMBER
PAYMENT_CONTENT_SID=$PAYMENT_CONTENT_SID
CREDIT_CARD_CONTENT_SID=$CREDIT_CARD_CONTENT_SID
ORDER_STATUS_CONTENT_SID=$ORDER_STATUS_CONTENT_SID
EOF

echo "Deploying functions with env file:"
cat "$ENV_FILE"

twilio serverless:deploy \
	--env .env \
	--service-name mercado-pago-serverless \
	--force

echo "✅ Functions deployed successfully"