// ============================================================================
// Metadata Keys for Reflect API
// ============================================================================

/**
 * Key for storing controller metadata (prefix, routes)
 */
export const CONTROLLER_METADATA = Symbol('controller:metadata');

/**
 * Key for storing route definitions on a controller
 */
export const ROUTES_METADATA = Symbol('routes:metadata');

/**
 * Key for storing injectable options
 */
export const INJECTABLE_METADATA = Symbol('injectable:metadata');

/**
 * Key for storing parameter injection metadata
 */
export const PARAM_METADATA = Symbol('param:metadata');

/**
 * Key for storing guards
 */
export const GUARDS_METADATA = Symbol('guards:metadata');

/**
 * Key for storing interceptors
 */
export const INTERCEPTORS_METADATA = Symbol('interceptors:metadata');

/**
 * Key for storing middleware
 */
export const MIDDLEWARE_METADATA = Symbol('middleware:metadata');

/**
 * Key for storing response status code
 */
export const HTTP_CODE_METADATA = Symbol('http:code:metadata');

/**
 * Key for storing response headers
 */
export const HEADERS_METADATA = Symbol('headers:metadata');

/**
 * Key for storing @Inject() metadata on constructor parameters
 */
export const INJECT_METADATA = Symbol('inject:metadata');

/**
 * Key for storing Zod validation schema on parameters
 */
export const ZOD_SCHEMA_METADATA = Symbol('zod:schema:metadata');

/**
 * Key for storing @Autowired() property injection metadata
 */
export const AUTOWIRED_METADATA = Symbol('autowired:metadata');

/**
 * Key for storing @Provider() metadata
 */
export const PROVIDER_METADATA = Symbol('provider:metadata');

/**
 * Parameter types for injection
 */
export enum ParamType {
  BODY = 'body',
  QUERY = 'query',
  PARAM = 'param',
  HEADERS = 'headers',
  REQUEST = 'request',
  REPLY = 'reply',
  CONTEXT = 'context',
}

/**
 * Default application configuration
 */
export const DEFAULT_CONFIG = {
  port: 3000,
  host: '0.0.0.0',
  logger: true,
  prefix: '',
} as const;
