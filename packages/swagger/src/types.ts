import type { ZodType } from 'zod';

export type OpenApiDataType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'boolean' 
  | 'array' 
  | 'object';

export type OpenApiFormat = 
  | 'int32' 
  | 'int64' 
  | 'float' 
  | 'double' 
  | 'date' 
  | 'date-time' 
  | 'password' 
  | 'byte' 
  | 'binary' 
  | 'email' 
  | 'uuid' 
  | 'uri' 
  | 'hostname' 
  | 'ipv4' 
  | 'ipv6';

export interface OpenApiSchemaObject {
  type?: OpenApiDataType;
  format?: string;
  description?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
  items?: OpenApiSchemaObject;
  properties?: Record<string, OpenApiSchemaObject>;
  required?: string[];
  nullable?: boolean;
  allOf?: OpenApiSchemaObject[];
  oneOf?: OpenApiSchemaObject[];
  anyOf?: OpenApiSchemaObject[];
  not?: OpenApiSchemaObject;
  $ref?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  additionalProperties?: boolean | OpenApiSchemaObject;
}

export type ParameterLocation = 'query' | 'path' | 'header' | 'cookie';

export interface OpenApiParameterObject {
  name: string;
  in: ParameterLocation;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: OpenApiSchemaObject;
  example?: unknown;
  examples?: Record<string, { value: unknown; summary?: string }>;
}

export interface OpenApiRequestBodyObject {
  description?: string;
  required?: boolean;
  content: Record<string, {
    schema?: OpenApiSchemaObject;
    example?: unknown;
    examples?: Record<string, { value: unknown; summary?: string }>;
  }>;
}

/**
 * OpenAPI Response Object
 */
export interface OpenApiResponseObject {
  description: string;
  content?: Record<string, {
    schema?: OpenApiSchemaObject;
    example?: unknown;
  }>;
  headers?: Record<string, {
    description?: string;
    schema?: OpenApiSchemaObject;
  }>;
}

export type OpenApiSecurityRequirement = Record<string, string[]>;

export interface OpenApiSecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: {
    implicit?: {
      authorizationUrl: string;
      scopes: Record<string, string>;
    };
    password?: {
      tokenUrl: string;
      scopes: Record<string, string>;
    };
    clientCredentials?: {
      tokenUrl: string;
      scopes: Record<string, string>;
    };
    authorizationCode?: {
      authorizationUrl: string;
      tokenUrl: string;
      scopes: Record<string, string>;
    };
  };
  openIdConnectUrl?: string;
}

export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: { url: string; description?: string };
  operationId?: string;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    description?: string;
    required?: boolean;
    deprecated?: boolean;
    schema?: OpenApiSchemaObject;
    example?: unknown;
  }>;
  requestBody?: {
    description?: string;
    required?: boolean;
    content: Record<string, {
      schema?: OpenApiSchemaObject;
      example?: unknown;
    }>;
  };
  responses: Record<string, {
    description: string;
    headers?: Record<string, {
      description?: string;
      schema?: OpenApiSchemaObject;
    }>;
    content?: Record<string, {
      schema?: OpenApiSchemaObject;
      example?: unknown;
    }>;
  }>;
  deprecated?: boolean;
  security?: Array<Record<string, string[]>>;
}

export interface OpenApiPathItem {
  get?: OpenApiOperation;
  put?: OpenApiOperation;
  post?: OpenApiOperation;
  delete?: OpenApiOperation;
  options?: OpenApiOperation;
  head?: OpenApiOperation;
  patch?: OpenApiOperation;
  trace?: OpenApiOperation;
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema?: OpenApiSchemaObject;
  }>;
}

/**
 * OpenAPI Info Object
 */
export interface OpenApiInfoObject {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
    identifier?: string;
  };
}

/**
 * OpenAPI Document (root object)
 */
export interface OpenApiDocument {
  openapi: string;
  info: OpenApiInfoObject;
  paths: Record<string, OpenApiPathItem>;
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<string, {
      default: string;
      description?: string;
      enum?: string[];
    }>;
  }>;
  components?: {
    schemas?: Record<string, OpenApiSchemaObject>;
    securitySchemes?: Record<string, OpenApiSecurityScheme | {
      type: string;
      description?: string;
      name?: string;
      in?: string;
      scheme?: string;
      bearerFormat?: string;
      flows?: unknown;
    }>;
    responses?: Record<string, OpenApiResponseObject>;
    parameters?: Record<string, OpenApiParameterObject>;
    requestBodies?: Record<string, OpenApiRequestBodyObject>;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{
    name: string;
    description?: string;
    externalDocs?: { url: string; description?: string };
  }>;
  externalDocs?: {
    url: string;
    description?: string;
  };
}

export interface ApiOperationOptions {
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  tags?: string[];
}

export interface ApiResponseOptions {
  status: number;
  description?: string;
  schema?: ZodType<unknown> | OpenApiSchemaObject;
  /** Content type (default: application/json) */
  type?: string;
  /** Example response value */
  example?: unknown;
  /** Whether response is an array */
  isArray?: boolean;
}

/**
 * Options for @ApiProperty() decorator
 */
export interface ApiPropertyOptions {
  /** Property description */
  description?: string;
  /** Example value */
  example?: unknown;
  /** Default value */
  default?: unknown;
  /** Whether the property is required */
  required?: boolean;
  /** Property type */
  type?: OpenApiDataType | string;
  /** Property format */
  format?: OpenApiFormat | string;
  /** Enum values */
  enum?: unknown[];
  /** Whether property can be null */
  nullable?: boolean;
  /** Minimum value (for numbers) */
  minimum?: number;
  /** Maximum value (for numbers) */
  maximum?: number;
  /** Minimum length (for strings/arrays) */
  minLength?: number;
  /** Maximum length (for strings/arrays) */
  maxLength?: number;
  /** Pattern (for strings) */
  pattern?: string;
  /** Mark property as deprecated */
  deprecated?: boolean;
  /** Mark property as read-only */
  readOnly?: boolean;
  /** Mark property as write-only */
  writeOnly?: boolean;
}

/**
 * Options for @ApiParam() decorator
 */
export interface ApiParamOptions {
  /** Parameter name (must match route parameter) */
  name: string;
  /** Parameter description */
  description?: string;
  /** Whether the parameter is required (default: true for path params) */
  required?: boolean;
  /** Parameter type */
  type?: OpenApiDataType | string;
  /** Parameter format */
  format?: OpenApiFormat | string;
  /** Example value */
  example?: unknown;
  /** Enum values */
  enum?: unknown[];
  /** Mark parameter as deprecated */
  deprecated?: boolean;
  /** Zod schema for validation */
  schema?: ZodType<unknown>;
}

/**
 * Options for @ApiQuery() decorator
 */
export interface ApiQueryOptions extends Omit<ApiParamOptions, 'required'> {
  /** Whether the query parameter is required (default: false) */
  required?: boolean;
  /** Whether the query parameter is an array */
  isArray?: boolean;
}

/**
 * Options for @ApiHeader() decorator
 */
export interface ApiHeaderOptions {
  /** Header name */
  name: string;
  /** Header description */
  description?: string;
  /** Whether the header is required */
  required?: boolean;
  /** Header data type */
  type?: OpenApiDataType | string;
  /** Mark header as deprecated */
  deprecated?: boolean;
  /** Example value */
  example?: unknown;
  /** Zod schema for validation */
  schema?: ZodType<unknown>;
}

/**
 * Options for @ApiBody() decorator
 */
export interface ApiBodyOptions {
  /** Request body description */
  description?: string;
  /** Whether the body is required (default: true) */
  required?: boolean;
  /** Content type (default: application/json) */
  type?: string;
  /** Zod schema or OpenAPI schema for the body */
  schema?: ZodType<unknown> | OpenApiSchemaObject;
  /** Example body value */
  example?: unknown;
  /** Multiple examples */
  examples?: Record<string, { value: unknown; summary?: string; description?: string }>;
  /** Whether body is an array */
  isArray?: boolean;
}

/**
 * Options for @ApiSecurity() decorator
 */
export interface ApiSecurityOptions {
  /** Security scheme name (must match a defined security scheme) */
  name: string;
  /** Required scopes */
  scopes?: string[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Server configuration for OpenAPI
 */
export interface SwaggerServerConfig {
  /** Server URL */
  url: string;
  /** Server description */
  description?: string;
  /** Server variables */
  variables?: Record<string, {
    default: string;
    description?: string;
    enum?: string[];
  }>;
}

/**
 * Contact information for OpenAPI
 */
export interface SwaggerContactConfig {
  /** Contact name */
  name?: string;
  /** Contact URL */
  url?: string;
  /** Contact email */
  email?: string;
}

/**
 * License information for OpenAPI
 */
export interface SwaggerLicenseConfig {
  /** License name */
  name: string;
  /** License URL */
  url?: string;
  /** SPDX License identifier */
  identifier?: string;
}

/**
 * External documentation configuration
 */
export interface SwaggerExternalDocsConfig {
  /** External documentation URL */
  url: string;
  /** Description */
  description?: string;
}

/**
 * Tag configuration
 */
export interface SwaggerTagConfig {
  /** Tag name */
  name: string;
  /** Tag description */
  description?: string;
  /** External documentation */
  externalDocs?: SwaggerExternalDocsConfig;
}

/**
 * Main Swagger/OpenAPI configuration
 */
export interface SwaggerConfig {
  /** API info object (title, version, description, etc.) */
  info?: OpenApiInfoObject;
  /** External documentation */
  externalDocs?: SwaggerExternalDocsConfig;
  /** Server configurations */
  servers?: SwaggerServerConfig[];
  /** Tag definitions */
  tags?: SwaggerTagConfig[];
  /** Security schemes */
  securitySchemes?: Record<string, OpenApiSecurityScheme>;
  /** Global security requirements */
  security?: OpenApiSecurityRequirement[];
  /** Path to serve OpenAPI JSON (default: /docs/json) */
  jsonPath?: string;
  /** Path to serve Swagger UI (default: /docs) */
  uiPath?: string;
  /** OpenAPI version (default: 3.0.3) */
  openApiVersion?: '3.0.0' | '3.0.1' | '3.0.2' | '3.0.3' | '3.1.0';
  /** Whether to include routes without explicit swagger decorators */
  includeUndocumented?: boolean;
  /** Base path prefix for all routes */
  basePath?: string;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Stored response metadata (internal)
 */
export interface StoredResponseMetadata extends ApiResponseOptions {
  _stored: true;
}

/**
 * Stored parameter metadata (internal)
 */
export interface StoredParamMetadata extends ApiParamOptions {
  _stored: true;
  location: ParameterLocation;
}

/**
 * Route info extracted from core metadata
 */
export interface ExtractedRouteInfo {
  method: string;
  path: string;
  handlerName: string | symbol;
  controllerPrefix: string;
  controllerClass: Function;
}

/**
 * Constructor type for class instantiation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = unknown> = new (...args: any[]) => T;
