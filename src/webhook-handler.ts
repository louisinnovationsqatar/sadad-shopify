// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import { type Request, type Response } from 'express';
import { SadadError } from '@louis-innovations/sadad-js-sdk';
import type { SadadShopify } from './sadad-shopify.js';
import { ShopifyOrderSync } from './shopify-order-sync.js';

/**
 * POST /sadad/webhook
 *
 * Receives asynchronous payment notifications from the SADAD gateway.
 *
 * SADAD sends a signed JSON payload containing:
 *   - transactionStatus (3 = success)
 *   - transaction_number
 *   - ORDER_ID  (Shopify order ID as set during checkout)
 *   - TXN_AMOUNT
 *   - checksumhash  (SHA-256 HMAC for verification)
 *
 * Workflow:
 *   1. Parse and verify the SADAD webhook signature.
 *   2. On success, call ShopifyOrderSync.markPaid().
 *   3. On failure, call ShopifyOrderSync.markFailed().
 *   4. Acknowledge receipt with { status: "success" }.
 *
 * IMPORTANT: The endpoint must always respond 200 with the success body
 * even when the order sync fails, to prevent SADAD from retrying.
 * Errors are logged for manual review.
 */
export async function webhookHandler(
  req: Request,
  res: Response,
  integration: SadadShopify,
): Promise<void> {
  let orderId = '';
  let transactionNumber = '';

  try {
    const payload = req.body as Record<string, unknown>;

    // Verify signature and parse SADAD webhook
    const result = integration.sadad.handleWebhook(payload);

    orderId = result.orderNumber;
    transactionNumber = result.transactionNumber;

    console.log(
      `[WebhookHandler] Received webhook for order ${orderId}, ` +
        `transaction ${transactionNumber}, success=${result.isSuccess}`,
    );

    const sync = new ShopifyOrderSync(integration);

    if (result.isSuccess) {
      await sync.markPaid(orderId, transactionNumber, result.amount, result.message);
      await sync.appendOrderNote(
        orderId,
        `SADAD payment confirmed. Transaction: ${transactionNumber}. Amount: ${result.amount.toFixed(2)} QAR.`,
      );
    } else {
      await sync.markFailed(orderId, transactionNumber, result.amount, result.message);
      await sync.appendOrderNote(
        orderId,
        `SADAD payment failed. Transaction: ${transactionNumber}. Message: ${result.message}`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof SadadError) {
      // Signature or SDK-level error — potential tampering, log prominently
      console.error(
        `[WebhookHandler] Signature verification failed for order ${orderId}: ${message}`,
      );
    } else {
      // Shopify sync error — log for manual recovery
      console.error(
        `[WebhookHandler] Shopify sync error for order ${orderId}: ${message}`,
      );
    }

    // Still acknowledge to SADAD to prevent flood of retries
  }

  // Always respond 200 with the SADAD success acknowledgement
  res.status(200).json(webhookSuccessBody());
}

export function webhookSuccessBody(): { status: string } {
  return { status: 'success' };
}

/**
 * POST /sadad/webhook
 *
 * Main webhook handler used by server.ts.
 */
export async function webhookHandlerV2(
  req: Request,
  res: Response,
  integration: SadadShopify,
): Promise<void> {
  let orderId = '';
  let transactionNumber = '';

  try {
    const payload = req.body as Record<string, unknown>;
    const result = integration.sadad.handleWebhook(payload);

    orderId = result.orderNumber;
    transactionNumber = result.transactionNumber;

    console.log(
      `[WebhookHandler] order=${orderId} txn=${transactionNumber} success=${result.isSuccess}`,
    );

    const sync = new ShopifyOrderSync(integration);

    if (result.isSuccess) {
      await sync.markPaid(orderId, transactionNumber, result.amount, result.message);
      await sync.appendOrderNote(
        orderId,
        `SADAD payment confirmed. Transaction: ${transactionNumber}. Amount: ${result.amount.toFixed(2)} QAR.`,
      );
    } else {
      await sync.markFailed(orderId, transactionNumber, result.amount, result.message);
      await sync.appendOrderNote(
        orderId,
        `SADAD payment failed. Transaction: ${transactionNumber}. Message: ${result.message}`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof SadadError) {
      console.error(`[WebhookHandler] Signature error for order ${orderId}: ${message}`);
    } else {
      console.error(`[WebhookHandler] Sync error for order ${orderId}: ${message}`);
    }
  }

  res.status(200).json(webhookSuccessBody());
}
