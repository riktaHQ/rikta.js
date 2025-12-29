# Quick Summary

## 🏆 Rikta vs Competition

| Metric | vs NestJS | vs Fastify |
|--------|-----------|------------|
| **Startup** | 🟢 **-37.7%** | +10.5% |
| **GET /** | 🟢 **-44.3%** | +26.4% |
| **POST /** | 🟢 **-14.8%** | -15.0% |
| **GET /:id** | 🟢 **-36.7%** | +10.0% |

## 📊 Key Numbers

```
Startup: Rikta 3.04ms | NestJS 4.88ms | Fastify 2.75ms
GET /  : Rikta 0.139ms | NestJS 0.250ms | Fastify 0.110ms
POST / : Rikta 0.113ms | NestJS 0.133ms | Fastify 0.133ms
GET/:id: Rikta 0.110ms | NestJS 0.174ms | Fastify 0.100ms
```

## ✅ Verdict

**Rikta is 32% faster than NestJS on average** while providing a similar developer experience with decorators and dependency injection.

## 🚀 Best Performance Settings

```typescript
const app = await Rikta.create({
  port: 3000,
  silent: true,    // Essential for performance
  logger: false    // Disable request logging
});
```
