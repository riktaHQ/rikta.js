# Benchmarks

Performance comparison between Rikta, NestJS, and Fastify.

## 🚀 Quick Start

```bash
npm install
npm run bench
```

## 📊 Available Benchmarks

### Startup Time (`npm run bench:startup`)

Measures framework initialization time from module import to server ready.

```bash
npm run bench:startup
```

### Request Overhead (`npm run bench:requests`)

Measures single-request latency with no concurrent load.

```bash
npm run bench:requests
```

### Load Testing (`npm run bench:autocannon`)

High-concurrency throughput testing using Autocannon.

```bash
npm run bench:autocannon
```

## 🎯 Results Summary

| Metric | Rikta vs NestJS | Rikta vs Fastify |
|--------|-----------------|------------------|
| Startup | 🟢 **-53% faster** | 🟢 **-6% faster** |
| Throughput | 🟢 **+7% faster** | 🟡 **~5% slower** |
| Latency | 🟢 **~35% faster** | 🟡 **competitive** |

**Key Takeaway:** Rikta is significantly faster than NestJS and adds minimal overhead over vanilla Fastify.

See [RESULTS.md](./RESULTS.md) for detailed results.

## 🔧 Test Configuration

### Rikta (Optimized)
```typescript
const app = await Rikta.create({
  port: 3001,
  silent: true,   // No console output
  logger: false   // No Fastify logging
});
```

### NestJS
```typescript
const app = await NestFactory.create(
  AppModule,
  new FastifyAdapter({ logger: false })
);
```

### Fastify (Baseline)
```typescript
const app = Fastify({ logger: false });
```

## 📁 Structure

```
benchmarks/
├── fixtures/
│   ├── fastify-fixture.ts    # Pure Fastify server
│   ├── nestjs-fixture.ts     # NestJS server
│   └── rikta-fixture.ts      # Rikta server
├── startup.bench.ts          # Startup time benchmark
├── request-overhead.bench.ts # Request latency benchmark
├── autocannon.bench.ts       # Load testing
├── RESULTS.md                # Detailed results
└── QUICK-SUMMARY.md          # Summary table
```

## 🧪 Methodology

### Startup Benchmark
1. Fork child process per framework
2. Measure time from process start to "ready" message
3. Run 5 iterations, take median
4. Fresh process each iteration

### Request Overhead
1. Start all frameworks (different ports)
2. Warm up with 10 requests each
3. Measure 100 sequential requests
4. Calculate median latency

### Load Testing
1. Concurrent connections: 10-100
2. Duration: 10 seconds
3. Measure requests/second and latency percentiles

## 💡 Tips

### For Best Results
- Run on Linux for consistent timing
- Close other applications
- Run multiple times, compare medians
- Use `silent: true` and `logger: false`

### Interpreting Results

- **Startup**: Lower is better. Important for serverless/cold starts.
- **Request Latency**: Lower is better. Measures framework overhead.
- **Throughput**: Higher is better. Measures sustained load capacity.

## 📚 Related Documentation

- [Optimization Guide](../docs/OPTIMIZATION.md) - Details on performance optimizations
- [Architecture](../docs/guide/architecture.md) - Framework architecture overview
