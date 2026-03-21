// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string = ''): string {
  return process.env[key] ?? fallback;
}

export interface AppConfig {
  // Server
  port: number;
  nodeEnv: string;

  // SADAD credentials
  sadadMerchantId: string;
  sadadSecretKey: string;
  sadadWebsite: string;
  sadadEnvironment: 'test' | 'live';
  sadadLanguage: 'eng' | 'arb';
  sadadCheckoutVersion: string;

  // SADAD callback & webhook URLs (served by this server)
  sadadCallbackUrl: string;
  sadadWebhookUrl: string;

  // Shopify
  shopifyStoreDomain: string;
  shopifyAdminAccessToken: string;
  shopifyApiVersion: string;
  shopifyWebhookSecret: string;

  // Redirect URLs after payment
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

export function loadConfig(): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development');

  return {
    // Server
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    nodeEnv,

    // SADAD
    sadadMerchantId: requireEnv('SADAD_MERCHANT_ID'),
    sadadSecretKey: requireEnv('SADAD_SECRET_KEY'),
    sadadWebsite: requireEnv('SADAD_WEBSITE'),
    sadadEnvironment: (optionalEnv('SADAD_ENVIRONMENT', 'test') as 'test' | 'live'),
    sadadLanguage: (optionalEnv('SADAD_LANGUAGE', 'eng') as 'eng' | 'arb'),
    sadadCheckoutVersion: optionalEnv('SADAD_CHECKOUT_VERSION', 'v1.1'),

    // SADAD endpoints (this server's public URLs)
    sadadCallbackUrl: requireEnv('SADAD_CALLBACK_URL'),
    sadadWebhookUrl: requireEnv('SADAD_WEBHOOK_URL'),

    // Shopify
    shopifyStoreDomain: requireEnv('SHOPIFY_STORE_DOMAIN'),
    shopifyAdminAccessToken: requireEnv('SHOPIFY_ADMIN_ACCESS_TOKEN'),
    shopifyApiVersion: optionalEnv('SHOPIFY_API_VERSION', '2024-10'),
    shopifyWebhookSecret: optionalEnv('SHOPIFY_WEBHOOK_SECRET', ''),

    // Post-payment redirects
    successRedirectUrl: requireEnv('SUCCESS_REDIRECT_URL'),
    failureRedirectUrl: requireEnv('FAILURE_REDIRECT_URL'),
  };
}
