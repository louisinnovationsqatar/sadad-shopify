// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import { type Request, type Response } from 'express';
import type { SadadShopify } from './sadad-shopify.js';
import type { OrderData } from '@louis-innovations/sadad-js-sdk';

/**
 * POST /sadad/checkout
 *
 * Accepts a Shopify order ID (or order name), fetches the order from the
 * Shopify Admin API, converts it into a SADAD OrderData payload, generates
 * the checkout form HTML, and returns it.
 *
 * Request body:
 *   { "order_id": "5678901234" }          — numeric Shopify order ID
 *   { "order_name": "#1001" }             — Shopify order name (alternative)
 *
 * Response (200):
 *   { "form_html": "<form ...>...</form>" }
 *
 * Response (4xx/5xx):
 *   { "error": "..." }
 */
export async function checkoutHandler(
  req: Request,
  res: Response,
  integration: SadadShopify,
): Promise<void> {
  try {
    const { order_id, order_name } = req.body as {
      order_id?: string;
      order_name?: string;
    };

    if (!order_id && !order_name) {
      res.status(400).json({ error: 'Either order_id or order_name is required.' });
      return;
    }

    // Fetch order from Shopify
    const order = order_id
      ? await integration.getShopifyOrder(String(order_id))
      : await integration.findOrderByName(String(order_name));

    if (!order) {
      res.status(404).json({ error: `Order not found: ${order_name ?? order_id}` });
      return;
    }

    // Guard: only process pending payments
    if (order.financial_status === 'paid') {
      res.status(409).json({ error: 'Order has already been paid.' });
      return;
    }

    const amount = parseFloat(order.total_price);
    if (isNaN(amount) || amount <= 0) {
      res.status(422).json({ error: `Invalid order amount: ${order.total_price}` });
      return;
    }

    // Build SADAD OrderData
    const orderData: OrderData = buildOrderData(order, integration);

    // Create checkout using the configured version
    const checkoutResult = integration.sadad.checkout(
      orderData,
      integration.checkoutVersion(),
    );

    const formHtml = checkoutResult.toHtmlForm('sadad-checkout-form', true);

    res.status(200).json({
      form_html: formHtml,
      checkout_url: checkoutResult.url,
      sadad_order_id: orderData.order_id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CheckoutHandler] Error:', message);
    res.status(500).json({ error: message });
  }
}

/**
 * GET /sadad/checkout/:orderId
 *
 * Browser-friendly endpoint that returns a full HTML page with the auto-
 * submitting SADAD form so customers are redirected to the gateway directly.
 */
export async function checkoutPageHandler(
  req: Request,
  res: Response,
  integration: SadadShopify,
): Promise<void> {
  try {
    const orderId = req.params['orderId'];

    if (!orderId) {
      res.status(400).send('<p>Order ID is required.</p>');
      return;
    }

    const order = await integration.getShopifyOrder(orderId);

    if (order.financial_status === 'paid') {
      res.redirect(integration.successUrl());
      return;
    }

    const orderData: OrderData = buildOrderData(order, integration);
    const checkoutResult = integration.sadad.checkout(orderData, integration.checkoutVersion());
    const formHtml = checkoutResult.toHtmlForm('sadad-checkout-form', true);

    const page = buildRedirectPage(formHtml, order.name);
    res.status(200).contentType('text/html').send(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[CheckoutPageHandler] Error:', message);
    res.status(500).send(`<p>Payment initialisation failed: ${escapeHtml(message)}</p>`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOrderData(
  order: import('./sadad-shopify.js').ShopifyOrder,
  integration: SadadShopify,
): OrderData {
  const amount = parseFloat(order.total_price);

  // Use the Shopify order ID as the SADAD ORDER_ID so we can correlate later.
  const orderData: OrderData = {
    order_id: String(order.id),
    amount,
    email: order.email ?? order.customer?.email ?? '',
    mobile: order.phone ?? order.customer?.phone ?? '',
  };

  // Build line items when there are multiple products
  if (order.line_items.length > 1) {
    orderData.items = order.line_items.map((item) => ({
      order_id: String(item.id),
      amount: parseFloat(item.price) * item.quantity,
      quantity: item.quantity,
    }));
  }

  return orderData;
}

function buildRedirectPage(formHtml: string, orderName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting to SADAD Payment — ${escapeHtml(orderName)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f6f6f6;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e0e0e0;
      border-top-color: #1a1a2e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { color: #555; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Redirecting to SADAD secure payment for order <strong>${escapeHtml(orderName)}</strong>&hellip;</p>
  </div>
  ${formHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
