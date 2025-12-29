# Benchmark Results

## 🏆 Summary

**Rikta outperforms NestJS in all metrics!**

| Metric | Rikta vs NestJS | Verdict |
|--------|-----------------|---------|
| **Startup** | 🟢 **-37.7%** | ✅ Rikta faster |
| **GET requests** | 🟢 **-44.3%** | ✅ Rikta faster |
| **POST requests** | 🟢 **-14.8%** | ✅ Rikta faster |
| **Param requests** | 🟢 **-36.7%** | ✅ Rikta faster |
| **Average** | 🟢 **-32.0%** | ✅ Rikta faster |

---

## 📊 Detailed Results

### Startup Time

Tests the time from module import to server ready.

```
┌────────────┬───────────┬────────────────┐
│ Framework  │ Time (ms) │ vs NestJS      │
├────────────┼───────────┼────────────────┤
│ Fastify    │ 2.75      │ -43.7%         │
│ Rikta      │ 3.04      │ 🟢 -37.7%      │
│ NestJS     │ 4.88      │ baseline       │
└────────────┴───────────┴────────────────┘
```

**Analysis**: Rikta starts 37.7% faster than NestJS thanks to:
- Silent mode (no console.log overhead)
- Optimized discovery and registration

---

### Request Overhead

Tests single request latency with warm server (no concurrent load).

#### GET / (Simple endpoint)
```
┌────────────┬─────────────┬────────────────┐
│ Framework  │ Latency     │ vs NestJS      │
├────────────┼─────────────┼────────────────┤
│ Fastify    │ 0.110ms     │ -56.0%         │
│ Rikta      │ 0.139ms     │ 🟢 -44.3%      │
│ NestJS     │ 0.250ms     │ baseline       │
└────────────┴─────────────┴────────────────┘
```

#### POST / (Body parsing)
```
┌────────────┬─────────────┬────────────────┐
│ Framework  │ Latency     │ vs NestJS      │
├────────────┼─────────────┼────────────────┤
│ Fastify    │ 0.133ms     │ 0%             │
│ Rikta      │ 0.113ms     │ 🟢 -14.8%      │
│ NestJS     │ 0.133ms     │ baseline       │
└────────────┴─────────────┴────────────────┘
```

#### GET /:id (Route params)
```
┌────────────┬─────────────┬────────────────┐
│ Framework  │ Latency     │ vs NestJS      │
├────────────┼─────────────┼────────────────┤
│ Fastify    │ 0.100ms     │ -63.3%         │
│ Rikta      │ 0.110ms     │ 🟢 -36.7%      │
│ NestJS     │ 0.174ms     │ baseline       │
└────────────┴─────────────┴────────────────┘
```

---

## 🔧 Test Configuration

```typescript
// Rikta (optimized)
const app = await Rikta.create({
  port: 3001,
  silent: true,   // No console output
  logger: false   // No Fastify logging
});

// NestJS
const app = await NestFactory.create(AppModule, 
  new FastifyAdapter({ logger: false })
);

// Fastify (baseline)
const app = Fastify({ logger: false });
```

---

## 📈 Performance Comparison

```
Startup Time (lower is better)
──────────────────────────────────────────────────────────
Fastify   ████████████████████                        2.75ms
Rikta     ██████████████████████                      3.04ms
NestJS    ███████████████████████████████████         4.88ms

Request Latency - GET / (lower is better)
──────────────────────────────────────────────────────────
Fastify   ████████████                                0.110ms
Rikta     ███████████████                             0.139ms
NestJS    ████████████████████████████                0.250ms

Request Latency - GET /:id (lower is better)
──────────────────────────────────────────────────────────
Fastify   ███████████                                 0.100ms
Rikta     ████████████                                0.110ms
NestJS    ███████████████████                         0.174ms
```

---

## 🧪 Running Benchmarks

```bash
cd benchmarks
npm install

# Run all benchmarks
npm run bench

# Individual benchmarks
npm run bench:startup      # Startup time comparison
npm run bench:requests     # Request overhead comparison
npm run bench:autocannon   # High-load throughput test
```

---

## 🔬 Methodology

### Startup Benchmark
1. Fork child process for each framework
2. Measure time from process start to "server ready" message
3. Run 5 iterations, take median
4. Ensure fresh process for each measurement

### Request Overhead Benchmark
1. Start all frameworks on different ports
2. Warm up with 10 requests each
3. Measure 100 sequential requests
4. Calculate median latency
5. No concurrent load (tests pure overhead)

### Environment
- Node.js v22.x
- Linux (for consistent timing)
- Fresh process for each test suite
- Disabled all logging

---

## 📝 Notes

- All frameworks use Fastify as HTTP engine
- Rikta and NestJS both use decorator-based architecture
- Silent mode is essential for production performance
- Results may vary based on hardware and Node.js version
