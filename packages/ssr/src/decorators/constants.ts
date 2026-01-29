/**
 * Metadata keys for SSR decorators
 * Using Symbol.for() for cross-package sharing
 */

export const SSR_CONTROLLER_METADATA = Symbol.for('rikta:ssr:controller:metadata');
export const SSR_ROUTE_METADATA = Symbol.for('rikta:ssr:route:metadata');
export const SSR_OPTIONS_METADATA = Symbol.for('rikta:ssr:options:metadata');
