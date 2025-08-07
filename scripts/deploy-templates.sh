set -e

ENV_FILE=".env-temp/templates.env"
mkdir -p .env-temp

# Clear env file
> "$ENV_FILE"

# Required base vars
echo "ACCOUNT_SID=$ACCOUNT_SID" >> $ENV_FILE
echo "AUTH_TOKEN=$AUTH_TOKEN" >> $ENV_FILE

echo "Uploading templates..."

for file in content-templates/*.json; do
	NAME=$(basename "$file" .json | tr 'a-z' 'A-Z')
	echo "Uploading template: $NAME"

	TEMPLATE_OUTPUT=$(twilio api:content:v1:content:create \
		--content-language pt_BR \
		--friendly-name "$NAME" \
		--channel-whatsapp '{"types":'$(jq .types "$file")'}' \
		--json)

	SID=$(echo "$TEMPLATE_OUTPUT" | jq -r .sid)
	echo "$NAME SID: $SID"

	twilio api:content:v1:content:approval:create \
		--path-content-sid "$SID" \
		--channel-type whatsapp \
		--category utility

	if [[ "$NAME" == "PIX" ]]; then
		echo "PAYMENT_CONTENT_SID=$SID" >> $ENV_FILE
	elif [[ "$NAME" == "CARD" ]]; then
		echo "CREDIT_CARD_CONTENT_SID=$SID" >> $ENV_FILE
	elif [[ "$NAME" == "STATUS" ]]; then
		echo "ORDER_STATUS_CONTENT_SID=$SID" >> $ENV_FILE
	fi
done

echo "✅ Templates uploaded and .env generated: $ENV_FILE"