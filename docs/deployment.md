# SADAD Shopify Integration — Deployment Guide

Built by Louis Innovations (www.louis-innovations.com)

---

## Option 1 — Node.js on a VPS (Recommended for Qatar)

### Prerequisites
- Ubuntu 22.04 / Debian 12 VPS
- Domain name pointing to the server IP
- Node.js 20.x installed

### Steps

```bash
# 1. Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone the repository
git clone https://github.com/louis-innovations/sadad-shopify.git /opt/sadad-shopify
cd /opt/sadad-shopify

# 3. Also clone the SDK dependency alongside it
git clone https://github.com/louis-innovations/sadad-js-sdk.git /opt/sadad-js-sdk

# 4. Install dependencies and build
npm install
npm run build

# 5. Create .env
cp .env.example .env
nano .env   # fill in your credentials

# 6. Install PM2 for process management
npm install -g pm2

# 7. Start the server
pm2 start dist/server.js --name sadad-shopify
pm2 save
pm2 startup
```

### Nginx Reverse Proxy

Install and configure nginx to proxy requests and handle SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y

# Create site config
sudo nano /etc/nginx/sites-available/sadad-shopify
```

Paste the following (replace `your-server.example.com`):

```nginx
server {
    listen 80;
    server_name your-server.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sadad-shopify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-server.example.com
```

---

## Option 2 — Docker

### Quick Start

```bash
# From the project root
docker compose up -d
```

The container starts on port 3000. Use nginx or a cloud load balancer in front for SSL.

### Build Manually

```bash
docker build -t sadad-shopify:latest .
docker run -d \
  --name sadad-shopify \
  --env-file .env \
  -p 3000:3000 \
  sadad-shopify:latest
```

### Health Check

```bash
docker exec sadad-shopify wget -qO- http://localhost:3000/health
```

---

## Option 3 — Vercel (Serverless)

Note: Vercel works for stateless handlers but has cold-start latency.

### Steps

1. Install the Vercel CLI:

```bash
npm install -g vercel
```

2. Create `vercel.json` in the project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ]
}
```

3. Set environment variables in the Vercel dashboard.

4. Deploy:

```bash
vercel --prod
```

---

## Option 4 — Railway / Render / Fly.io

These platforms support Node.js deployments with minimal configuration.

### Railway

```bash
npm install -g @railway/cli
railway login
railway up
```

Set all `.env` variables in the Railway dashboard under **Variables**.

### Render

1. Connect your GitHub repository.
2. Set **Build Command**: `npm install && npm run build`
3. Set **Start Command**: `npm start`
4. Add all environment variables in the Render dashboard.

---

## SSL / TLS Requirements

SADAD requires HTTPS for callback and webhook URLs. Ensure:

- Your domain has a valid SSL certificate (Let's Encrypt is free).
- The certificate is not self-signed.
- HTTP to HTTPS redirect is in place.

---

## Security Recommendations

| Recommendation | Why |
|---|---|
| Use a reverse proxy (nginx) | Hide Node.js process, handle SSL |
| Set `NODE_ENV=production` | Disables stack traces in error responses |
| Restrict the refund endpoint | Add your own auth middleware to `/sadad/refund` |
| Rotate `SADAD_SECRET_KEY` periodically | Reduces exposure window if compromised |
| Keep `SHOPIFY_ADMIN_ACCESS_TOKEN` scoped | Request only `read_orders, write_orders` |
| Enable firewall (ufw) | Block all ports except 80, 443, 22 |

### Protect the Refund Endpoint

Add a simple bearer token check before exposing `/sadad/refund` publicly:

```typescript
// In server.ts, before the refund route:
app.use('/sadad/refund', (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${process.env.REFUND_API_KEY}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});
```

Add `REFUND_API_KEY=your-secret-key` to `.env`.
