import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

// Extend Window interface for SSR data
declare global {
  interface Window {
    __SSR_DATA__?: Record<string, unknown>;
  }
}

/**
 * Client-side hydration
 * Hydrates the server-rendered HTML with React interactivity
 */
const container = document.getElementById('app');

// Get SSR data injected by server
const serverData = window.__SSR_DATA__ || {};

if (container) {
  hydrateRoot(
    container,
    <App url={window.location.pathname + window.location.search} serverData={serverData} />
  );
}
