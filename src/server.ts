// SADAD Shopify Integration — Express Server
// Built by Louis Innovations (www.louis-innovations.com)

import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import { SadadShopify } from './sadad-shopify.js';
import { checkoutHandler, checkoutPageHandler } from './checkout-handler.js';
import { webhookHandlerV2 } from './webhook-handler.js';
import { callbackHandler } from './callback-handler.js';
import { refundHandler } from './refund-handler.js';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const config = loadConfig();
const integration = new SadadShopify(config);

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Parse JSON bodies — used by the checkout and refund endpoints
app.use(express.json({ limit: '1mb' }));

// Parse URL-encoded bodies — SADAD callback comes as form POST
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS — restrict to your Shopify store domain in production
app.use(
  cors({
    origin:
      config.nodeEnv === 'production'
        ? [`https://${config.shopifyStoreDomain}`]
        : '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: '@louis-innovations/sadad-shopify',
    environment: config.sadadEnvironment,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// SADAD routes
// ---------------------------------------------------------------------------

/**
 * POST /sadad/checkout
 * JSON API endpoint — Shopify theme JS calls this to get the payment form HTML.
 */
app.post('/sadad/checkout', (req: Request, res: Response) => {
  checkoutHandler(req, res, integration).catch((err: unknown) => {
    console.error('[Server] Unhandled error in checkoutHandler:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
});

/**
 * GET /sadad/checkout/:orderId
 * Browser-friendly redirect page — embed as the SADAD payment link in email / theme.
 */
app.get('/sadad/checkout/:orderId', (req: Request, res: Response) => {
  checkoutPageHandler(req, res, integration).catch((err: unknown) => {
    console.error('[Server] Unhandled error in checkoutPageHandler:', err);
    res.status(500).send('<p>Internal server error</p>');
  });
});

/**
 * POST /sadad/webhook
 * Asynchronous payment notification from SADAD (must be publicly reachable).
 */
app.post('/sadad/webhook', (req: Request, res: Response) => {
  webhookHandlerV2(req, res, integration).catch((err: unknown) => {
    console.error('[Server] Unhandled error in webhookHandler:', err);
    // Acknowledge even on unexpected error
    res.status(200).json({ status: 'success' });
  });
});

/**
 * POST /sadad/callback
 * Synchronous redirect after customer completes checkout on SADAD gateway.
 */
app.post('/sadad/callback', (req: Request, res: Response) => {
  callbackHandler(req, res, integration).catch((err: unknown) => {
    console.error('[Server] Unhandled error in callbackHandler:', err);
    res.redirect(302, config.failureRedirectUrl);
  });
});

/**
 * POST /sadad/refund
 * Admin-triggered full refund endpoint (should be protected by your admin auth).
 */
app.post('/sadad/refund', (req: Request, res: Response) => {
  refundHandler(req, res, integration).catch((err: unknown) => {
    console.error('[Server] Unhandled error in refundHandler:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });
});

// ---------------------------------------------------------------------------
// 404 and global error handler
// ---------------------------------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(config.port, () => {
  console.log(
    `SADAD Shopify integration server running on port ${config.port} [${config.nodeEnv}]`,
  );
  console.log(`  SADAD environment : ${config.sadadEnvironment}`);
  console.log(`  Shopify store     : ${config.shopifyStoreDomain}`);
  console.log(`  Callback URL      : ${config.sadadCallbackUrl}`);
  console.log(`  Webhook URL       : ${config.sadadWebhookUrl}`);
});

export default app;
