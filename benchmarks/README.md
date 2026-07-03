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

### Request Scope Path (`npm run bench:request-scope`)

Measures the overhead of enabling request scope and of resolving a request-scoped
dependency through the lazy proxy path in singleton components.

```bash
npm run bench:request-scope
```

### Load Testing (`npm run bench:autocannon`)

High-concurrency throughput testing using Autocannon.

```bash
npm run bench:autocannon
```

## 🎯 Results Summary

| Metric | Rikta vs NestJS | Rikta vs Fastify |
|--------|-----------------|------------------|
| Startup | 🟢 **-43% faster** | 🟢 **-13% faster** |
| Throughput | 🟢 **+9% faster** | 🟡 **~equivalent** |
| Latency | 🟢 **~40% faster** | 🟡 **~2-5% overhead** |

**Key Takeaway:** Rikta is ~40% faster than NestJS and adds minimal overhead (~2-5%) over vanilla Fastify. This is expected since Rikta uses Fastify as its HTTP engine.

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

### Request Scope Path
1. Start one Rikta app without any request-scoped provider
2. Start one Rikta app with a request-scoped provider registered
3. Interleave requests across:
  - plain Rikta route without request scope
  - plain route inside a request-enabled app
  - route that resolves a request-scoped dependency through a lazy proxy
4. Compare the per-request overhead of each path

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
