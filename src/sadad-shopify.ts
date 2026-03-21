// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import { SadadClient, SadadConfig } from '@louis-innovations/sadad-js-sdk';
import type { AppConfig } from './config.js';

/**
 * SadadShopify bridges the SADAD JS SDK with the Shopify Admin REST API.
 *
 * Responsibilities:
 *  - Hold a single SadadClient instance configured from AppConfig.
 *  - Expose helper methods used by the individual route handlers.
 *  - Proxy Shopify Admin API calls with proper auth headers.
 */
export class SadadShopify {
  readonly sadad: SadadClient;
  private readonly config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;

    const sadadConfig = new SadadConfig({
      merchantId: config.sadadMerchantId,
      secretKey: config.sadadSecretKey,
      website: config.sadadWebsite,
      environment: config.sadadEnvironment,
      language: config.sadadLanguage,
      callbackUrl: config.sadadCallbackUrl,
      webhookUrl: config.sadadWebhookUrl,
    });

    this.sadad = new SadadClient(sadadConfig);
  }

  // ---------------------------------------------------------------------------
  // Shopify Admin API helpers
  // ---------------------------------------------------------------------------

  /**
   * Base URL for Shopify Admin REST API.
   */
  shopifyApiBase(): string {
    return `https://${this.config.shopifyStoreDomain}/admin/api/${this.config.shopifyApiVersion}`;
  }

  /**
   * Default headers required for Shopify Admin REST requests.
   */
  shopifyHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.config.shopifyAdminAccessToken,
    };
  }

  /**
   * Fetch a Shopify order by its numeric ID.
   *
   * @throws Error when the HTTP response is not OK.
   */
  async getShopifyOrder(orderId: string): Promise<ShopifyOrder> {
    const url = `${this.shopifyApiBase()}/orders/${orderId}.json`;
    const response = await fetch(url, { headers: this.shopifyHeaders() });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Shopify API error fetching order ${orderId}: ${response.status} ${body}`,
      );
    }

    const json = (await response.json()) as { order: ShopifyOrder };
    return json.order;
  }

  /**
   * Look up a Shopify order by its name/number (e.g. "#1001").
   * Uses the Shopify orders search endpoint.
   */
  async findOrderByName(orderName: string): Promise<ShopifyOrder | null> {
    const params = new URLSearchParams({ name: orderName, status: 'any' });
    const url = `${this.shopifyApiBase()}/orders.json?${params.toString()}`;
    const response = await fetch(url, { headers: this.shopifyHeaders() });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Shopify API error searching orders: ${response.status} ${body}`,
      );
    }

    const json = (await response.json()) as { orders: ShopifyOrder[] };
    return json.orders[0] ?? null;
  }

  /**
   * Retrieve the merchant's checkout version preference from config.
   */
  checkoutVersion(): string {
    return this.config.sadadCheckoutVersion;
  }

  /**
   * Post-payment success redirect URL.
   */
  successUrl(): string {
    return this.config.successRedirectUrl;
  }

  /**
   * Post-payment failure redirect URL.
   */
  failureUrl(): string {
    return this.config.failureRedirectUrl;
  }
}

// ---------------------------------------------------------------------------
// Shopify type definitions (subset of the Admin REST API)
// ---------------------------------------------------------------------------

export interface ShopifyLineItem {
  id: number;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  price: string;
  total_discount: string;
}

export interface ShopifyCustomer {
  id: number;
  email: string | null;
  phone: string | null;
  first_name: string;
  last_name: string;
}

export interface ShopifyTransaction {
  id: number;
  kind: string;
  status: string;
  amount: string;
  gateway: string;
  message: string | null;
  authorization: string | null;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  order_number: number;
  email: string | null;
  phone: string | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItem[];
  customer: ShopifyCustomer | null;
  tags: string;
  note: string | null;
  note_attributes: Array<{ name: string; value: string }>;
}
