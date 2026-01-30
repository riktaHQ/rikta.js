import { createContext } from 'react';
import type { RouterContextValue } from '../types.js';

/**
 * Default router context value for when no provider is present
 */
const defaultRouterContext: RouterContextValue = {
  pathname: '/',
  search: '',
  href: '/',
  navigate: () => {
    console.warn('[RiktaReact] Router context not initialized. Wrap your app with <RiktaProvider>');
  },
  params: {},
  setParams: () => {},
  isNavigating: false,
};

/**
 * React context for router state
 * Provides navigation utilities and current location info
 */
export const RouterContext = createContext<RouterContextValue>(defaultRouterContext);

RouterContext.displayName = 'RiktaRouterContext';
