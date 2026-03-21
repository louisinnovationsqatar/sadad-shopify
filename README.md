# @louis-innovations/sadad-shopify

SADAD Payment Gateway integration for Shopify stores.

Built by Louis Innovations (www.louis-innovations.com)

---

## Overview

A standalone Node.js/Express server that merchants deploy alongside their Shopify store to accept payments via the [SADAD Qatar](https://sadadqa.com) payment gateway.

Built on top of [@louis-innovations/sadad-js-sdk](https://github.com/louis-innovations/sadad-js-sdk).

## Features

- SADAD checkout v1.1, v2.1, and v2.2 support
- Shopify Admin REST API integration — orders updated automatically
- Webhook signature verification
- Callback handler with customer redirect
- Full refund support via SADAD API
- Shopify Liquid templates for theme integration
- Docker support for easy deployment
- TypeScript source, fully typed

## Quick Start

```bash
git clone https://github.com/louis-innovations/sadad-shopify.git
cd sadad-shopify
npm install
cp .env.example .env   # fill in credentials
npm run build
npm start
```

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/sadad/checkout` | Initiate checkout (returns form HTML) |
| GET | `/sadad/checkout/:orderId` | Browser redirect page |
| POST | `/sadad/callback` | SADAD payment callback |
| POST | `/sadad/webhook` | SADAD async webhook |
| POST | `/sadad/refund` | Full refund |

## Documentation

- [Setup Guide](docs/setup-guide.md)
- [Theme Integration](docs/theme-integration.md)
- [Deployment](docs/deployment.md)

## License

MIT — see [LICENSE](LICENSE)
