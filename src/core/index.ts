// Core exports
export * from './types';
export * from './constants';
export * from './container';
export * from './registry';
export * from './discovery';
export * from './lifecycle';
export * from './router/router';
export * from './application';
export * from './decorators';
export * from './exceptions';

// Re-export Zod for convenience
// This allows users to import everything from '@riktajs/core':
// import { z, Body, Controller } from '@riktajs/core';
export { z } from 'zod';
export type { ZodType, ZodSchema, ZodError, ZodIssue, infer as ZodInfer } from 'zod';
