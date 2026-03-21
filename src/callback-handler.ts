// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import { type Request, type Response } from 'express';
import { SadadError } from '@louis-innovations/sadad-js-sdk';
import type { SadadShopify } from './sadad-shopify.js';
import { ShopifyOrderSync } from './shopify-order-sync.js';

/**
 * POST /sadad/callback
 *
 * Handles the synchronous redirect callback from SADAD after the customer
 * completes (or abandons) payment on the SADAD-hosted checkout page.
 *
 * SADAD POSTs the following form fields:
 *   ORDERID            — Shopify order ID
 *   transaction_number — SADAD transaction reference
 *   TXNAMOUNT          — Amount
 *   RESPCODE           — "1" = success, other = failure
 *   RESPMSG            — Human-readable status message
 *   STATUS             — TXN_SUCCESS / TXN_FAILURE / PENDING
 *   checksumhash       — Signature for v1.1; or AES hash for v2.x
 *
 * Workflow:
 *   1. Verify the SADAD callback signature.
 *   2. Sync Shopify order financial status.
 *   3. Redirect the customer to the configured success or failure URL.
 *
 * The redirect carries query params so the Shopify theme can display feedback:
 *   ?order_id=...&sadad_txn=...&status=success|failure
 */
export async function callbackHandler(
  req: Request,
  res: Response,
  integration: SadadShopify,
): Promise<void> {
  let orderId = '';
  let transactionNumber = '';
  let isSuccess = false;

  try {
    // SADAD sends as POST form data
    const postData = req.body as Record<string, unknown>;

    const checkoutVersion = integration.checkoutVersion();
    const result = integration.sadad.handleCallback(postData, checkoutVersion);

    orderId = result.orderNumber;
    transactionNumber = result.transactionNumber;
    isSuccess = result.isSuccess;

    console.log(
      `[CallbackHandler] order=${orderId} txn=${transactionNumber} ` +
        `respCode=${result.responseCode} success=${isSuccess}`,
    );

    const sync = new ShopifyOrderSync(integration);

    if (isSuccess) {
      await sync.markPaid(orderId, transactionNumber, result.amount, result.responseMessage);
      await sync.appendOrderNote(
        orderId,
        `SADAD callback: payment confirmed. Transaction: ${transactionNumber}.`,
      );
    } else {
      await sync.markFailed(orderId, transactionNumber, result.amount, result.responseMessage);
      await sync.appendOrderNote(
        orderId,
        `SADAD callback: payment failed (${result.responseCode}). Message: ${result.responseMessage}`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof SadadError) {
      console.error(`[CallbackHandler] Signature error for order ${orderId}: ${message}`);
    } else {
      console.error(`[CallbackHandler] Error for order ${orderId}: ${message}`);
    }

    isSuccess = false;
  }

  // Redirect customer to the appropriate post-payment page
  const params = new URLSearchParams({
    order_id: orderId,
    sadad_txn: transactionNumber,
    status: isSuccess ? 'success' : 'failure',
  });

  const baseUrl = isSuccess ? integration.successUrl() : integration.failureUrl();
  const separator = baseUrl.includes('?') ? '&' : '?';
  res.redirect(302, `${baseUrl}${separator}${params.toString()}`);
}
