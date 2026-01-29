import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { HeadBuilder } from '@riktajs/ssr';

/**
 * Server-side render function
 * Called by @riktajs/ssr to render the application to HTML
 */
export function render(url: string, context: Record<string, unknown> = {}) {
  const html = renderToString(
    <App url={url} serverData={context} />
  );

  // Build head tags using HeadBuilder
  const head = new HeadBuilder();

  // Title comes from @Ssr decorator via context
  const title = (context.title as string) || 'Rikta SSR React';
  head.title(title);

  // Description from @Ssr decorator
  if (context.description) {
    head.description(context.description as string);
  }

  // Open Graph tags from @Ssr decorator
  if (context.og) {
    head.og(context.og as Parameters<typeof head.og>[0]);
  }

  // Twitter Card tags from @Ssr decorator
  if (context.twitter) {
    head.twitter(context.twitter as Parameters<typeof head.twitter>[0]);
  }

  // Canonical URL
  if (context.canonical) {
    head.canonical(context.canonical as string);
  }

  // Robots directive
  if (context.robots) {
    head.robots(context.robots as string);
  }

  // Custom head tags from @Ssr decorator
  if (context.head && Array.isArray(context.head)) {
    head.addTags(context.head);
  }

  // Add SSR data for client hydration
  head.withSsrData(context);
  
  return {
    html,
    title: head.getTitle(),
    head: head.build(),
  };
}
