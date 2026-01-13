/** Metadata keys for Reflect API. Using Symbol.for() for cross-package sharing. */

export const CONTROLLER_METADATA = Symbol.for('rikta:controller:metadata');
export const ROUTES_METADATA = Symbol.for('rikta:routes:metadata');
export const INJECTABLE_METADATA = Symbol.for('rikta:injectable:metadata');
export const PARAM_METADATA = Symbol.for('rikta:param:metadata');
export const GUARDS_METADATA = Symbol.for('rikta:guards:metadata');
export const INTERCEPTORS_METADATA = Symbol.for('rikta:interceptors:metadata');
export const MIDDLEWARE_METADATA = Symbol.for('rikta:middleware:metadata');
export const HTTP_CODE_METADATA = Symbol.for('rikta:http:code:metadata');
export const HEADERS_METADATA = Symbol.for('rikta:headers:metadata');
export const INJECT_METADATA = Symbol.for('rikta:inject:metadata');
export const ZOD_SCHEMA_METADATA = Symbol.for('rikta:zod:schema:metadata');
export const AUTOWIRED_METADATA = Symbol.for('rikta:autowired:metadata');
export const PROVIDER_METADATA = Symbol.for('rikta:provider:metadata');

/** Stores @Provider() token for config provider auto-discovery. */
export const CONFIG_PROVIDER_METADATA = Symbol('config:provider:metadata');

/** Maps @ConfigProperty() properties to env var names (explicit or auto upper_snake_case). */
export const CONFIG_PROPERTY_METADATA = Symbol('config:property:metadata');

export enum ParamType {
  BODY = 'body',
  QUERY = 'query',
  PARAM = 'param',
  HEADERS = 'headers',
  REQUEST = 'request',
  REPLY = 'reply',
  CONTEXT = 'context',
}

export const DEFAULT_CONFIG = {
  port: 3000,
  host: '0.0.0.0',
  logger: true,
  prefix: '',
} as const;
