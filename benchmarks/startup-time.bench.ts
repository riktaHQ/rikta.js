import 'reflect-metadata';
import { performance } from 'perf_hooks';
import Fastify from 'fastify';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { RiktaFactory } from '../src/core/application';
import { StartupBenchService, StartupBenchController } from './fixtures/startup.fixture';
import { NestStartupBenchModule } from './fixtures/nestjs-startup.fixture';

// ===== Benchmark Functions =====

async function benchmarkNestJSStartup(iterations: number = 10): Promise<number[]> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const app = await NestFactory.create(
      NestStartupBenchModule,
      new FastifyAdapter(),
      { logger: false }
    );

    await app.listen(0, '127.0.0.1');
    
    const end = performance.now();
    times.push(end - start);

    await app.close();
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return times;
}

async function benchmarkRiktaStartup(iterations: number = 10): Promise<number[]> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const app = await RiktaFactory.create({
      port: 0, // random port
      autowired: false,
      silent: true,
      controllers: [StartupBenchController],
      providers: [StartupBenchService]
    });

    await app.listen();
    
    const end = performance.now();
    times.push(end - start);

    await app.close();
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return times;
}

async function benchmarkFastifyStartup(iterations: number = 10): Promise<number[]> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    const app = Fastify({ logger: false });

    app.get('/bench/hello', async () => {
      return { message: 'Hello from service' };
    });

    app.get('/bench/simple', async () => {
      return { message: 'Simple response' };
    });

    await app.listen({ port: 0, host: '127.0.0.1' });
    
    const end = performance.now();
    times.push(end - start);

    await app.close();
    
    // Small delay between iterations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return times;
}

// ===== Statistics =====

function calculateStats(times: number[]) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = times.reduce((a, b) => a + b, 0);
  const mean = sum / times.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];

  return { mean, min, max, median, p95, p99 };
}

function formatTime(ms: number): string {
  return `${ms.toFixed(2)}ms`;
}

// ===== Main Benchmark =====

async function runBenchmark() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║        STARTUP TIME BENCHMARK - Rikta vs Fastify vs NestJS               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

  const iterations = 10;
  console.log(`Running ${iterations} iterations for each framework...\n`);

  // Warm-up
  console.log('⏳ Warming up...');
  await benchmarkFastifyStartup(2);
  await benchmarkRiktaStartup(2);
  await benchmarkNestJSStartup(2);
  console.log('✓ Warm-up completed\n');

  // Benchmark Fastify
  console.log('📊 Benchmarking Fastify...');
  const fastifyTimes = await benchmarkFastifyStartup(iterations);
  const fastifyStats = calculateStats(fastifyTimes);
  console.log('✓ Fastify completed\n');

  // Benchmark Rikta
  console.log('📊 Benchmarking Rikta...');
  const riktaTimes = await benchmarkRiktaStartup(iterations);
  const riktaStats = calculateStats(riktaTimes);
  console.log('✓ Rikta completed\n');

  // Benchmark NestJS
  console.log('📊 Benchmarking NestJS...');
  const nestTimes = await benchmarkNestJSStartup(iterations);
  const nestStats = calculateStats(nestTimes);
  console.log('✓ NestJS completed\n');

  // Display Results
  console.log('╔═══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                  RESULTS                                          ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║ Metric    │  Fastify        │  Rikta          │  NestJS         │ Rikta vs Fast ║');
  console.log('╟───────────┼─────────────────┼─────────────────┼─────────────────┼───────────────╢');
  
  const metrics = [
    ['Mean', fastifyStats.mean, riktaStats.mean, nestStats.mean],
    ['Median', fastifyStats.median, riktaStats.median, nestStats.median],
    ['Min', fastifyStats.min, riktaStats.min, nestStats.min],
    ['Max', fastifyStats.max, riktaStats.max, nestStats.max],
    ['P95', fastifyStats.p95, riktaStats.p95, nestStats.p95],
    ['P99', fastifyStats.p99, riktaStats.p99, nestStats.p99],
  ];

  metrics.forEach(([name, fastify, rikta, nest]) => {
    const riktaDiff = ((Number(rikta) - Number(fastify)) / Number(fastify) * 100).toFixed(1);
    const riktaDiffStr = riktaDiff.startsWith('-') ? `${riktaDiff}%` : `+${riktaDiff}%`;
    console.log(`║ ${String(name).padEnd(9)} │ ${formatTime(Number(fastify)).padEnd(15)} │ ${formatTime(Number(rikta)).padEnd(15)} │ ${formatTime(Number(nest)).padEnd(15)} │ ${riktaDiffStr.padStart(13)} ║`);
  });

  console.log('╚═══════════════════════════════════════════════════════════════════════════════════╝\n');

  // Overhead calculation
  const riktaOverhead = riktaStats.mean - fastifyStats.mean;
  const riktaOverheadPercent = (riktaOverhead / fastifyStats.mean * 100).toFixed(1);
  const nestOverhead = nestStats.mean - fastifyStats.mean;
  const nestOverheadPercent = (nestOverhead / fastifyStats.mean * 100).toFixed(1);
  
  console.log('📈 OVERHEAD ANALYSIS:');
  console.log(`   • Fastify mean: ${formatTime(fastifyStats.mean)}`);
  console.log(`   • Rikta mean: ${formatTime(riktaStats.mean)} (+${formatTime(riktaOverhead)} / ${riktaOverheadPercent}%)`);
  console.log(`   • NestJS mean: ${formatTime(nestStats.mean)} (+${formatTime(nestOverhead)} / ${nestOverheadPercent}%)\n`);
}

// Run
runBenchmark().catch(console.error);
