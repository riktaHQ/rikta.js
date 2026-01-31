import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

/**
 * Client-side hydration entry point
 * 
 * No provider needed! SSR data is accessed directly via
 * getSsrData() or useSsrData() from window.__SSR_DATA__
 */
const container = document.getElementById('app');

if (container) {
  hydrateRoot(container, <App />);
}
