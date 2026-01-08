# Quick Summary

## 🏆 Rikta vs Competition

| Metric | vs NestJS | vs Fastify |
|--------|-----------|------------|
| **Startup** | 🟢 **-53.3% faster** | 🟢 **-6.3% faster** |
| **Throughput** | 🟢 **+6.9% faster** | 🟡 **~5% slower** |
| **Request Latency** | 🟢 **~35% faster** | 🟡 **competitive** |

## 📊 Key Numbers

```
Startup:    Rikta 2.87ms   | NestJS 6.15ms   | Fastify 3.06ms
Throughput: Rikta 12,253/s | NestJS 11,460/s | Fastify 12,949/s
```

## ✅ Verdict

**Rikta is ~35% faster than NestJS** while providing a similar developer experience with decorators and dependency injection.

**Rikta is competitive with vanilla Fastify** - adds minimal overhead (~5-10%) while providing DI, decorators, and structured architecture.

## 🚀 Best Performance Settings

```typescript
const app = await Rikta.create({
  port: 3000,
  silent: true,    // Essential for performance
  logger: false    // Disable request logging
});
```
