/**
 * Logger Service
 * 
 * Simple logging service to demonstrate @Autowired dependency injection
 * inside queue processors.
 */

import { Injectable } from '@riktajs/core';

@Injectable()
export class LoggerService {
  private context: string = 'App';

  setContext(context: string): void {
    this.context = context;
  }

  info(message: string, ...args: unknown[]): void {
    console.log(`[${this.context}] ℹ️  ${message}`, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    console.log(`[${this.context}] ✅ ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.context}] ⚠️  ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.context}] ❌ ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(`[${this.context}] 🔍 ${message}`, ...args);
  }
}
