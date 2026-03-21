# Changelog

Built by Louis Innovations (www.louis-innovations.com)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2025-03-21

### Added

- Initial release of `@louis-innovations/sadad-shopify`.
- Express server with SADAD payment integration for Shopify stores.
- Checkout handler: creates SADAD payment form from Shopify order data.
- Webhook handler: verifies and processes asynchronous SADAD payment notifications.
- Callback handler: handles synchronous SADAD redirect after payment.
- Refund handler: issues full refunds via SADAD API and syncs to Shopify.
- `ShopifyOrderSync`: updates Shopify order financial status, creates transactions and refunds.
- `SadadShopify` integration class bridging the SADAD JS SDK and Shopify Admin API.
- Environment-based configuration via `dotenv`.
- Shopify Liquid templates: `checkout-page.liquid`, `payment-form.liquid`.
- Dockerfile and `docker-compose.yml` for containerised deployment.
- Documentation: setup guide, theme integration guide, deployment guide.
- Full TypeScript source with strict mode enabled.
- SADAD checkout versions v1.1, v2.1, v2.2 supported.
- CORS support with production origin restriction.
- Health check endpoint.
