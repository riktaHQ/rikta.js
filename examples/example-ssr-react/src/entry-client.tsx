import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { RiktaProvider } from '@riktajs/react';
import { App } from './App';

/**
 * Client-side hydration entry point
 * 
 * RiktaProvider automatically picks up window.__SSR_DATA__
 * and provides routing context to the entire app.
 */
const container = document.getElementById('app');

if (container) {
  hydrateRoot(
    container,
    <RiktaProvider>
      <App />
    </RiktaProvider>
  );
}
