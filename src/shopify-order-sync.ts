// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import type { SadadShopify } from './sadad-shopify.js';

export type PaymentSyncStatus = 'paid' | 'partially_paid' | 'pending' | 'voided' | 'refunded';

export interface PaymentSyncOptions {
  /** Shopify numeric order ID */
  orderId: string;
  /** SADAD transaction number */
  transactionNumber: string;
  /** Amount actually paid */
  amount: number;
  /** Human-readable status message from SADAD */
  statusMessage: string;
  /** Target financial_status to set on the order */
  financialStatus: PaymentSyncStatus;
}

/**
 * ShopifyOrderSync applies payment status changes to Shopify orders using the
 * Admin REST API.
 *
 * It creates a Transaction record on the order (Shopify uses transactions to
 * track payment captures and refunds) which automatically updates
 * financial_status on the order.
 */
export class ShopifyOrderSync {
  constructor(private readonly integration: SadadShopify) {}

  /**
   * Mark an order as paid by posting a "sale" transaction.
   */
  async markPaid(
    orderId: string,
    transactionNumber: string,
    amount: number,
    message: string = 'SADAD payment received',
  ): Promise<void> {
    await this.createTransaction(orderId, {
      kind: 'sale',
      status: 'success',
      amount: amount.toFixed(2),
      gateway: 'sadad',
      authorization: transactionNumber,
      message,
    });

    // Also tag the order for easy filtering in the Shopify admin
    await this.addOrderTag(orderId, 'sadad-paid');
  }

  /**
   * Mark an order as voided / payment failed.
   */
  async markFailed(
    orderId: string,
    transactionNumber: string,
    amount: number,
    message: string = 'SADAD payment failed',
  ): Promise<void> {
    await this.createTransaction(orderId, {
      kind: 'void',
      status: 'failure',
      amount: amount.toFixed(2),
      gateway: 'sadad',
      authorization: transactionNumber,
      message,
    });

    await this.addOrderTag(orderId, 'sadad-failed');
  }

  /**
   * Mark an order as refunded by posting a "refund" transaction.
   */
  async markRefunded(
    orderId: string,
    transactionNumber: string,
    amount: number,
    message: string = 'SADAD refund processed',
  ): Promise<void> {
    // Shopify refunds are recorded via the Refunds API, not Transactions.
    // We create a transaction for audit purposes and then create the refund.
    await this.createTransaction(orderId, {
      kind: 'refund',
      status: 'success',
      amount: amount.toFixed(2),
      gateway: 'sadad',
      authorization: transactionNumber,
      message,
    });

    await this.createShopifyRefund(orderId, amount, message);
    await this.addOrderTag(orderId, 'sadad-refunded');
  }

  /**
   * Write an order note appending the SADAD transaction number for traceability.
   */
  async appendOrderNote(orderId: string, note: string): Promise<void> {
    const url = `${this.integration.shopifyApiBase()}/orders/${orderId}.json`;

    // Fetch current note to append rather than overwrite
    const existing = await this.integration.getShopifyOrder(orderId);
    const updatedNote = existing.note ? `${existing.note}\n${note}` : note;

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.integration.shopifyHeaders(),
      body: JSON.stringify({ order: { id: Number(orderId), note: updatedNote } }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Shopify API error updating order note: ${response.status} ${body}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async createTransaction(
    orderId: string,
    transaction: {
      kind: string;
      status: string;
      amount: string;
      gateway: string;
      authorization: string;
      message: string;
    },
  ): Promise<void> {
    const url = `${this.integration.shopifyApiBase()}/orders/${orderId}/transactions.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.integration.shopifyHeaders(),
      body: JSON.stringify({ transaction }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Shopify API error creating transaction on order ${orderId}: ${response.status} ${body}`,
      );
    }
  }

  private async createShopifyRefund(
    orderId: string,
    amount: number,
    note: string,
  ): Promise<void> {
    const url = `${this.integration.shopifyApiBase()}/orders/${orderId}/refunds.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.integration.shopifyHeaders(),
      body: JSON.stringify({
        refund: {
          notify: true,
          note,
          shipping: { full_refund: false },
          transactions: [
            {
              kind: 'refund',
              gateway: 'sadad',
              amount: amount.toFixed(2),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      // Non-fatal: log but do not rethrow — the SADAD refund succeeded
      console.warn(
        `[ShopifyOrderSync] Refund record creation failed for order ${orderId}: ${response.status} ${body}`,
      );
    }
  }

  private async addOrderTag(orderId: string, tag: string): Promise<void> {
    try {
      const order = await this.integration.getShopifyOrder(orderId);
      const existingTags = order.tags ? order.tags.split(', ').map((t) => t.trim()) : [];

      if (existingTags.includes(tag)) return;

      existingTags.push(tag);
      const url = `${this.integration.shopifyApiBase()}/orders/${orderId}.json`;

      await fetch(url, {
        method: 'PUT',
        headers: this.integration.shopifyHeaders(),
        body: JSON.stringify({
          order: { id: Number(orderId), tags: existingTags.join(', ') },
        }),
      });
    } catch (err) {
      // Tag updates are best-effort — do not fail the payment flow
      console.warn(`[ShopifyOrderSync] Tag update failed for order ${orderId}:`, err);
    }
  }
}
