# Twilio Mercado Pago Integration

## Description
A ready-for-use integration between [Twilio Messaging](https://www.twilio.com/messaging) and [Mercado Pago](https://www.mercadopago.com.br/) built on Twilio Functions. It creates payment requests through Mercado Pago and delivers WhatsApp messages using Twilio Content Templates. The repo contains:

- `mercado-pago-serverless/` – Twilio Serverless project with Functions and helpers.
- `content-templates/` – JSON definitions for WhatsApp Content Templates.
- `scripts/` – Shell scripts to deploy templates and functions.
- `.github/workflows/` – GitHub Actions for automated deployments.

## Pre-requisites
- Node.js 18+
- [Twilio CLI](https://www.twilio.com/docs/twilio-cli) with `@twilio-labs/plugin-serverless`
- `jq` and `curl` (for template scripts or GitHub Actions)
- Twilio account with a WhatsApp-enabled phone number
- Mercado Pago account and access token

## Deployment
### 3.1 Deployment using GitHub Actions (`.github/workflows`)
1. Add repository secrets `ACCOUNT_SID`, `AUTH_TOKEN`, `MERCADO_PAGO_ACCESS_TOKEN` and `WHATSAPP_FROM_NUMBER`.
2. Run **Deploy Content Templates** to create WhatsApp templates from `content-templates/*.json`.
3. Run **Deploy Twilio Serverless** to deploy Functions. It automatically reuses template SIDs.
4. Alternatively, **Full Deploy: Templates + Serverless** runs both steps together.

### 3.2 Deployment using Shell Script (`scripts`)
1. Execute `./scripts/deploy-templates.sh` to create and approve templates. The script writes generated SIDs to `.env-temp/templates.env`.
2. Create `mercado-pago-serverless/.env.local` with your credentials (see Environment Variables below).
3. Execute `./scripts/deploy-functions.sh` to deploy the Functions using the Twilio CLI.

### 3.3 Manual deployment (Twilio CLI)
1. `cd mercado-pago-serverless`
2. `cp .env.example .env` and fill in the required variables.
3. Deploy with `twilio serverless:deploy --env .env --service-name mercado-pago-serverless --force`

## Template creation
The repository can auto-create templates using the GitHub Action or `scripts/deploy-templates.sh`. If you prefer to create templates manually:
1. In the [Twilio Console](https://console.twilio.com/), go to **Messaging > Content Template Builder** and create your template (PIX, CARD, STATUS).
2. After approval, copy the resulting SID (starts with `HX`).
3. Paste the SID into `mercado-pago-serverless/.env.local` under the corresponding variable (`PAYMENT_CONTENT_SID`, `CREDIT_CARD_CONTENT_SID`, `ORDER_STATUS_CONTENT_SID`).

## Environment Variables
| Name | Description |
| --- | --- |
| `ACCOUNT_SID` | Twilio Account SID |
| `AUTH_TOKEN` | Twilio Auth Token |
| `WHATSAPP_FROM_NUMBER` | WhatsApp-enabled Twilio number in E.164 format |
| `PAYMENT_CONTENT_SID` | Content Template SID used for PIX payment messages |
| `CREDIT_CARD_CONTENT_SID` | Content Template SID for credit card payment links |
| `ORDER_STATUS_CONTENT_SID` | Content Template SID for order status notifications |
| `MERCADO_PAGO_ACCESS_TOKEN` | Mercado Pago access token |
| `MERCADO_PAGO_WEBHOOK_URL` | (Optional) Public webhook URL for Mercado Pago callbacks |

## Usage
1. Call the deployed Function `create-payment` with parameters:
   - `items` – array of `{id,label,quantity,amount}`
   - `paymentMethod` – `PIX` or `CREDIT_CARD`
   - `phoneNumber` – customer WhatsApp number
   - `payer` – `{firstName,lastName,email,identification}`
   - `referenceId` – order ID
2. Mercado Pago notifications hit `payment-callback`, which sends status updates via WhatsApp using `ORDER_STATUS_CONTENT_SID`.

This project provides a starting point; customize templates and business logic as needed.
