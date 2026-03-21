// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import { type Request, type Response } from 'express';
import { RefundError } from '@louis-innovations/sadad-js-sdk';
import type { SadadShopify } from './sadad-shopify.js';
import { ShopifyOrderSync } from './shopify-order-sync.js';

/**
 * POST /sadad/refund
 *
 * Issues a full refund through SADAD for a previously paid Shopify order.
 *
 * SADAD supports full refunds only (no partial refunds).
 * The order must:
 *   - Be financially paid.
 *   - Have a SADAD transaction number recorded in the order's note attributes
 *     under the key "sadad_transaction_number".
 *   - Have been paid within the last 90 days.
 *
 * Request body:
 *   { "order_id": "5678901234" }
 *
 * Response (200):
 *   { "success": true, "refund_details": { ... } }
 *
 * Response (4xx/5xx):
 *   { "success": false, "error": "..." }
 *
 * After a successful SADAD refund, the Shopify order is updated via
 * ShopifyOrderSync.markRefunded() which creates a refund transaction and
 * appends an order note.
 */
export async function refundHandler(
  req: Request,
  res: Response,
  integration: SadadShopify,
): Promise<void> {
  const { order_id } = req.body as { order_id?: string };

  if (!order_id) {
    res.status(400).json({ success: false, error: 'order_id is required.' });
    return;
  }

  let order: import('./sadad-shopify.js').ShopifyOrder;

  try {
    order = await integration.getShopifyOrder(String(order_id));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(404).json({ success: false, error: `Order not found: ${message}` });
    return;
  }

  // Only paid orders can be refunded
  if (order.financial_status !== 'paid') {
    res.status(409).json({
      success: false,
      error: `Order financial_status is "${order.financial_status}". Only "paid" orders can be refunded.`,
    });
    return;
  }

  // Retrieve the SADAD transaction number stored in order note_attributes
  const transactionNumber = extractNoteAttribute(order.note_attributes, 'sadad_transaction_number');

  if (!transactionNumber) {
    res.status(422).json({
      success: false,
      error:
        'No SADAD transaction number found on this order. ' +
        'The order note_attributes must contain a "sadad_transaction_number" key.',
    });
    return;
  }

  try {
    // Issue refund via SADAD
    const refundResult = await integration.sadad.refund(transactionNumber);

    if (!refundResult['success']) {
      const errMsg = String(refundResult['error'] ?? 'Refund request rejected by SADAD.');
      res.status(502).json({ success: false, error: errMsg });
      return;
    }

    // Sync refund status back to Shopify
    const amount = parseFloat(order.total_price);
    const sync = new ShopifyOrderSync(integration);

    await sync.markRefunded(
      String(order.id),
      transactionNumber,
      amount,
      `SADAD full refund processed for order ${order.name}.`,
    );

    await sync.appendOrderNote(
      String(order.id),
      `SADAD refund completed. Transaction: ${transactionNumber}. Amount: ${amount.toFixed(2)} QAR.`,
    );

    console.log(
      `[RefundHandler] Refund successful for order ${order.name}, transaction ${transactionNumber}`,
    );

    res.status(200).json({
      success: true,
      order_id: String(order.id),
      order_name: order.name,
      transaction_number: transactionNumber,
      amount: amount.toFixed(2),
      refund_details: refundResult['refund_details'] ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof RefundError) {
      console.warn(`[RefundHandler] RefundError for order ${order.name}: ${message}`);
      res.status(422).json({ success: false, error: message });
    } else {
      console.error(`[RefundHandler] Unexpected error for order ${order.name}: ${message}`);
      res.status(500).json({ success: false, error: message });
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNoteAttribute(
  attrs: Array<{ name: string; value: string }> | undefined,
  key: string,
): string | null {
  if (!attrs) return null;
  const attr = attrs.find((a) => a.name === key);
  return attr?.value ?? null;
}
