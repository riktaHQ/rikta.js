// Core exports
export * from './types.js';
export * from './constants.js';
export * from './container/index.js';
export * from './registry.js';
export * from './discovery.js';
export * from './lifecycle/index.js';
export * from './router/router.js';
export * from './application.js';
export * from './decorators/index.js';
export * from './exceptions/index.js';
export * from './guards/index.js';
export * from './middleware/index.js';
export * from './interceptors/index.js';
export * from './config/index.js';
export * from './metadata.js';
export * from './profiler/index.js';

// Re-export Zod for convenience
// This allows users to import everything from '@riktajs/core':
// import { z, Body, Controller } from '@riktajs/core';
export { z } from 'zod';
export type { ZodType, ZodSchema, ZodError, ZodIssue, infer as ZodInfer } from 'zod';

// Re-export Fastify types for convenience
// This allows users to import Fastify types directly from '@riktajs/core':
export type {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';