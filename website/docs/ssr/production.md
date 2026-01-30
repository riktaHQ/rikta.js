---
title: Production Deployment
sidebar_label: Production
description: Deploy your SSR application to production
---

# Production Deployment

Learn how to build, optimize, and deploy your Rikta SSR application to production.

## Build Process

### 1. Build Client and Server

```bash
npm run build
```

This runs two builds:

```json title="package.json"
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build --outDir dist/client",
    "build:server": "vite build --outDir dist/server --ssr src/entry-server.tsx"
  }
}
```

### 2. Directory Structure

After build, you'll have:

```
dist/
├── client/
│   ├── assets/
│   │   ├── index-abc123.js
│   │   ├── index-def456.css
│   │   └── ...
│   ├── index.html
│   └── .vite/
│       └── ssr-manifest.json
└── server/
    └── entry-server.js
```

### 3. Start Production Server

```bash
NODE_ENV=production node dist/server.js
```

Or use your start script:

```bash
npm start
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Build client and server bundles
- [ ] Configure reverse proxy (nginx/caddy)
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure logging
- [ ] Enable compression
- [ ] Set security headers
- [ ] Configure CORS if needed
- [ ] Set up health checks
- [ ] Configure error tracking

## Server Configuration

### Basic Production Server

```typescript title="src/server.ts"
import { Rikta } from '@riktajs/core';
import { ssrPlugin } from '@riktajs/ssr';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = await Rikta.create({
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || '0.0.0.0',
  });

  // Enable compression
  if (isProduction) {
    await app.server.register(import('@fastify/compress'));
  }

  // Register SSR plugin
  await app.server.register(ssrPlugin, {
    root: resolve(__dirname, '..'),
    entryServer: isProduction
      ? './dist/server/entry-server.js'
      : './src/entry-server.tsx',
    template: './index.html',
    dev: !isProduction,
    buildDir: 'dist',
  });

  // Health check endpoint
  app.server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await app.listen();
  
  console.log(`Server running on http://localhost:${app.port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
```

### Environment Variables

```bash title=".env.production"
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
```

Load with:

```typescript
import { config } from 'dotenv';

if (process.env.NODE_ENV === 'production') {
  config({ path: '.env.production' });
}
```

## Nginx Reverse Proxy

### Configuration

```nginx title="/etc/nginx/sites-available/myapp"
upstream myapp {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Static Assets
    location /assets/ {
        alias /var/www/myapp/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy to Node.js
    location / {
        proxy_pass http://myapp;
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

### Enable and Test

```bash
sudo ln -s /etc/nginx/sites-available/myapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Process Manager

### Using PM2

Install PM2:

```bash
npm install -g pm2
```

Create ecosystem file:

```javascript title="ecosystem.config.js"
module.exports = {
  apps: [{
    name: 'myapp',
    script: './dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }],
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Useful PM2 commands:

```bash
pm2 list              # List all processes
pm2 logs myapp        # View logs
pm2 restart myapp     # Restart app
pm2 reload myapp      # Zero-downtime reload
pm2 stop myapp        # Stop app
pm2 delete myapp      # Delete app from PM2
pm2 monit             # Monitor resources
```

## Docker Deployment

### Dockerfile

```dockerfile title="Dockerfile"
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.html ./
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml title="docker-compose.yml"
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Build and Run

```bash
docker-compose build
docker-compose up -d
docker-compose logs -f
```

## Platform Deployments

### Vercel

Not recommended for Rikta SSR (requires serverless functions). Use traditional VPS instead.

### Railway

Create `railway.toml`:

```toml title="railway.toml"
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

Deploy:

```bash
railway up
```

### DigitalOcean App Platform

Create `app.yaml`:

```yaml title="app.yaml"
name: myapp
services:
  - name: web
    github:
      repo: username/repo
      branch: main
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 3000
    health_check:
      http_path: /health
    envs:
      - key: NODE_ENV
        value: production
```

### AWS EC2

1. Launch EC2 instance (Ubuntu 22.04)
2. Connect via SSH
3. Install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

4. Install nginx:

```bash
sudo apt-get install nginx
```

5. Clone and setup app:

```bash
git clone https://github.com/username/repo.git
cd repo
npm install
npm run build
```

6. Setup PM2 and start:

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Monitoring

### Application Logging

```typescript title="src/server.ts"
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});

async function bootstrap() {
  const app = await Rikta.create({
    logger,
  });
  
  // Log requests
  app.server.addHook('onRequest', async (request, reply) => {
    logger.info({
      method: request.method,
      url: request.url,
      ip: request.ip,
    }, 'Incoming request');
  });
  
  // ... rest of setup
}
```

### Error Tracking with Sentry

```bash
npm install @sentry/node
```

```typescript title="src/server.ts"
import * as Sentry from '@sentry/node';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
  });
}

async function bootstrap() {
  const app = await Rikta.create({ /* ... */ });
  
  // Error handler
  app.server.setErrorHandler((error, request, reply) => {
    Sentry.captureException(error, {
      extra: {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
    });
    
    reply.status(500).send({ error: 'Internal Server Error' });
  });
  
  // ... rest of setup
}
```

## Performance Tips

### Enable Compression

```bash
npm install @fastify/compress
```

```typescript
await app.server.register(import('@fastify/compress'));
```

### HTTP/2 Support

```typescript
import { readFileSync } from 'fs';

const app = await Rikta.create({
  https: {
    key: readFileSync('./certs/key.pem'),
    cert: readFileSync('./certs/cert.pem'),
  },
  http2: true,
});
```

### Static Asset Caching

```typescript
await app.server.register(import('@fastify/static'), {
  root: resolve(__dirname, '../dist/client'),
  prefix: '/assets/',
  maxAge: '1y',
  immutable: true,
});
```

### CDN Integration

Serve static assets from CDN:

```typescript title="vite.config.ts"
export default defineConfig({
  build: {
    assetsDir: 'assets',
  },
  experimental: {
    renderBuiltUrl(filename) {
      return `https://cdn.example.com/${filename}`;
    },
  },
});
```

## Security Best Practices

### Helmet for Security Headers

```bash
npm install @fastify/helmet
```

```typescript
await app.server.register(import('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
});
```

### Rate Limiting

```bash
npm install @fastify/rate-limit
```

```typescript
await app.server.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
});
```

### CORS Configuration

```bash
npm install @fastify/cors
```

```typescript
await app.server.register(import('@fastify/cors'), {
  origin: ['https://example.com'],
  credentials: true,
});
```

## Troubleshooting

### Memory Leaks

Monitor memory usage:

```bash
pm2 start ecosystem.config.js --max-memory-restart 500M
```

### High CPU Usage

Check number of instances:

```javascript
// ecosystem.config.js
instances: process.env.INSTANCES || 2, // Don't use 'max' if unnecessary
```

### Slow Response Times

Enable caching at controller level:

```typescript
@Ssr({
  title: 'Page',
  cache: {
    maxAge: 60,
    staleWhileRevalidate: 120,
  },
})
```
