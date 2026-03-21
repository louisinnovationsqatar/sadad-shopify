# SADAD Shopify Integration — Setup Guide

Built by Louis Innovations (www.louis-innovations.com)

---

## Prerequisites

| Requirement | Minimum version |
|---|---|
| Node.js | 18.x |
| npm | 9.x |
| Shopify store | Any plan with API access |
| SADAD merchant account | Active test or live account |

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/louis-innovations/sadad-shopify.git
cd sadad-shopify
npm install
```

---

## Step 2 — Configure Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# SADAD credentials (from SADAD merchant portal)
SADAD_MERCHANT_ID=1234567
SADAD_SECRET_KEY=your-secret-key
SADAD_WEBSITE=YOURWEBSITE
SADAD_ENVIRONMENT=test   # change to 'live' for production

# This server's public URLs (must be reachable by SADAD)
SADAD_CALLBACK_URL=https://your-server.example.com/sadad/callback
SADAD_WEBHOOK_URL=https://your-server.example.com/sadad/webhook

# Shopify Admin API
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxx

# Where to send customers after payment
SUCCESS_REDIRECT_URL=https://your-store.myshopify.com/pages/payment-success
FAILURE_REDIRECT_URL=https://your-store.myshopify.com/pages/payment-failure
```

---

## Step 3 — Shopify Admin API Token

1. Open Shopify Admin > **Settings** > **Apps and sales channels**.
2. Click **Develop apps** > **Create an app**.
3. Name the app (e.g. "SADAD Integration").
4. Under **Configuration**, add Admin API scopes:
   - `read_orders`
   - `write_orders`
5. Click **Install app** and copy the **Admin API access token**.
6. Paste the token into `SHOPIFY_ADMIN_ACCESS_TOKEN` in `.env`.

---

## Step 4 — Build and Run

```bash
# Build TypeScript
npm run build

# Start the server
npm start
```

The server starts on `http://localhost:3000` by default.

Verify it is running:

```bash
curl http://localhost:3000/health
# {"status":"ok","service":"@louis-innovations/sadad-shopify","environment":"test",...}
```

---

## Step 5 — Expose the Server Publicly

SADAD must be able to POST to your callback and webhook URLs. Use one of:

### Option A — Deploy to a VPS / cloud server

See `docs/deployment.md` for full instructions.

### Option B — Tunnel for local development

```bash
# Using ngrok
ngrok http 3000

# Copy the HTTPS URL, e.g. https://abc123.ngrok.io
# Update your .env:
SADAD_CALLBACK_URL=https://abc123.ngrok.io/sadad/callback
SADAD_WEBHOOK_URL=https://abc123.ngrok.io/sadad/webhook
```

---

## Step 6 — Register URLs in SADAD Merchant Portal

1. Log in to the [SADAD merchant portal](https://sadadqa.com).
2. Navigate to your integration settings.
3. Set the **Callback URL** to your `SADAD_CALLBACK_URL`.
4. Set the **Webhook URL** to your `SADAD_WEBHOOK_URL`.
5. Save the changes.

---

## Step 7 — Add Payment Button to Shopify Theme

Copy the Liquid snippet to your theme:

```bash
# In your Shopify theme directory
cp templates/checkout-page.liquid snippets/sadad-checkout-page.liquid
```

Then render the snippet in your checkout or cart template:

```liquid
{% render 'sadad-checkout-page', order: order %}
```

Set the server URL in Shopify Admin > **Online Store** > **Themes** > **Customize** > **Theme settings**:

```
SADAD Server URL: https://your-server.example.com
```

---

## Step 8 — Test a Payment

1. Place a test order in your Shopify store.
2. Note the order ID from the Shopify admin.
3. Trigger a checkout:

```bash
curl -X POST https://your-server.example.com/sadad/checkout \
  -H "Content-Type: application/json" \
  -d '{"order_id": "YOUR_ORDER_ID"}'
```

4. Open the returned `form_html` in a browser to complete the test payment.
5. Verify the order's financial status updates to `paid` in Shopify Admin.

---

## API Endpoints Reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/sadad/checkout` | JSON API — returns form HTML |
| GET | `/sadad/checkout/:orderId` | Browser redirect page |
| POST | `/sadad/callback` | SADAD payment callback (form POST) |
| POST | `/sadad/webhook` | SADAD async webhook |
| POST | `/sadad/refund` | Trigger full refund |

---

## Troubleshooting

### "Merchant ID must be exactly 7 digits"

Ensure `SADAD_MERCHANT_ID` is a 7-digit numeric string.

### "Order not found"

Verify `SHOPIFY_ADMIN_ACCESS_TOKEN` has `read_orders` scope and the store domain is correct.

### Callback not received

- Confirm `SADAD_CALLBACK_URL` is publicly reachable (no localhost).
- Check firewall rules allow inbound POST requests.
- Verify the URL is registered in the SADAD portal.

### Webhook signature error

- Confirm `SADAD_SECRET_KEY` matches the key in the SADAD portal exactly.
- Do not modify the webhook body before it reaches the handler.
