# SADAD Shopify Integration — Theme Integration Guide

Built by Louis Innovations (www.louis-innovations.com)

---

## Overview

This guide explains how to add the SADAD payment option to your Shopify theme so customers can pay using the SADAD Qatar gateway directly from your store.

---

## Option 1 — Liquid Snippet (Recommended)

### 1.1 Copy the snippet

Copy `templates/checkout-page.liquid` from this repository into your Shopify theme's `snippets/` directory and rename it:

```
snippets/sadad-payment.liquid
```

### 1.2 Add the server URL to theme settings

In your theme's `config/settings_schema.json`, add a setting for the SADAD server URL:

```json
{
  "name": "SADAD Payment",
  "settings": [
    {
      "type": "text",
      "id": "sadad_server_url",
      "label": "SADAD Server URL",
      "info": "The public URL of your deployed SADAD Shopify integration server.",
      "placeholder": "https://your-sadad-server.example.com"
    },
    {
      "type": "image_picker",
      "id": "sadad_logo",
      "label": "SADAD Logo",
      "info": "Optional logo displayed on the payment redirect page."
    }
  ]
}
```

### 1.3 Render in your cart or checkout

In `sections/cart-template.liquid` or your custom checkout page:

```liquid
{%- if settings.sadad_server_url != blank -%}
  {% render 'sadad-payment', order: cart %}
{%- endif -%}
```

---

## Option 2 — Draft Order Approach

For stores that need to capture payment after checkout, use Shopify Draft Orders:

1. Create a Shopify Draft Order via the Admin API.
2. POST the draft order ID to `/sadad/checkout`.
3. Redirect the customer to the SADAD gateway.
4. On successful callback, complete the Draft Order via the Shopify API.

```javascript
// In your theme JS or custom app
async function initiateSadadPayment(draftOrderId) {
  const response = await fetch('https://your-sadad-server.example.com/sadad/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: draftOrderId })
  });

  const data = await response.json();

  if (data.form_html) {
    // Inject and auto-submit the form
    const container = document.createElement('div');
    container.innerHTML = data.form_html;
    document.body.appendChild(container);
  }
}
```

---

## Option 3 — Direct Redirect Link

Generate a direct link to the browser-friendly checkout page for use in order confirmation emails or custom payment pages:

```
https://your-sadad-server.example.com/sadad/checkout/{SHOPIFY_ORDER_ID}
```

Use this in Shopify notification templates (Admin > Settings > Notifications):

```liquid
<a href="https://your-sadad-server.example.com/sadad/checkout/{{ order.id }}">
  Pay now with SADAD
</a>
```

---

## Post-Payment Pages

Create two pages in Shopify Admin > **Online Store** > **Pages**:

### payment-success

URL handle: `payment-success`

Add to the content:

```liquid
{% if request.path contains 'payment-success' %}
  {% assign params = request.path | split: '?' | last %}
  <div class="payment-success">
    <h1>Payment Successful</h1>
    <p>Thank you for your payment. Your order is being processed.</p>
  </div>
{% endif %}
```

### payment-failure

URL handle: `payment-failure`

```liquid
<div class="payment-failure">
  <h1>Payment Failed</h1>
  <p>Your payment could not be processed. Please try again or contact support.</p>
  <a href="/cart">Return to cart</a>
</div>
```

---

## Storing the SADAD Transaction Number on Orders

To enable refunds, the SADAD transaction number must be saved to the Shopify order. Add this to your webhook/callback success handler or as a Shopify Flow automation:

The integration automatically appends the transaction number to the order note. For programmatic access via the API, you can use the Shopify Admin API to add note attributes:

```json
{
  "order": {
    "note_attributes": [
      {
        "name": "sadad_transaction_number",
        "value": "TXN123456789"
      }
    ]
  }
}
```

The refund endpoint reads the `sadad_transaction_number` note attribute to identify which SADAD transaction to refund.

---

## Customising the Payment Button

Edit `snippets/sadad-payment.liquid` to match your theme's design system.

Key CSS classes:

| Class | Purpose |
|---|---|
| `.sadad-payment-option` | Container |
| `.sadad-payment-option__button` | Pay button |
| `.sadad-payment-option__error` | Error message |
| `.sadad-payment-option__spinner` | Loading indicator |

---

## Multi-Language Support

The `payment-form.liquid` template uses Shopify's `t` filter for translations.

Add translation strings to your theme's `locales/en.default.json`:

```json
{
  "sadad": {
    "redirect_title": "Redirecting to SADAD Secure Payment",
    "redirect_heading": "Redirecting to SADAD",
    "redirect_subtitle": "You are being redirected to the SADAD secure payment gateway.",
    "secure_badge": "Secured by SADAD",
    "redirect_not_redirected": "Not redirecting?",
    "redirect_click_here": "Click here"
  }
}
```

And for Arabic (`locales/ar.json`):

```json
{
  "sadad": {
    "redirect_title": "جارٍ التحويل إلى الدفع الآمن عبر سداد",
    "redirect_heading": "جارٍ التحويل إلى سداد",
    "redirect_subtitle": "سيتم تحويلك إلى بوابة الدفع الآمنة من سداد.",
    "secure_badge": "مؤمَّن بواسطة سداد",
    "redirect_not_redirected": "لم يتم التحويل؟",
    "redirect_click_here": "اضغط هنا"
  }
}
```
