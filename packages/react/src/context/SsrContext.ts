import { createContext } from 'react';
import type { SsrData } from '../types.js';

/**
 * React context for SSR data
 * Holds the server-rendered data passed via window.__SSR_DATA__
 */
export const SsrContext = createContext<SsrData | null>(null);

SsrContext.displayName = 'RiktaSsrContext';
