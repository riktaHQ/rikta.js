import 'reflect-metadata';
import {
  CONTROLLER_METADATA,
  ROUTES_METADATA,
  PARAM_METADATA,
  HTTP_CODE_METADATA,
  GUARDS_METADATA,
  ZOD_SCHEMA_METADATA,
} from './constants.js';
import type { RouteDefinition, ControllerMetadata } from './types.js';
import type { ParamMetadata } from './decorators/param.decorator.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = unknown> = new (...args: any[]) => T;

export function getControllerMetadata(target: Constructor): ControllerMetadata | undefined {
  return Reflect.getMetadata(CONTROLLER_METADATA, target);
}

export function isController(target: Constructor): boolean {
  return Reflect.hasMetadata(CONTROLLER_METADATA, target);
}

export function getControllerPath(target: Constructor): string {
  const meta = getControllerMetadata(target);
  return meta?.prefix ?? '';
}

export function getRoutes(target: Constructor): RouteDefinition[] {
  return Reflect.getMetadata(ROUTES_METADATA, target) || [];
}

/**
 * Check if a controller has any routes
 */
export function hasRoutes(target: Constructor): boolean {
  const routes = getRoutes(target);
  return routes.length > 0;
}

// ============================================================================
// Parameter Metadata
// ============================================================================

/**
 * Get parameter metadata for a specific method
 */
export function getParamMetadata(
  target: Constructor,
  methodName: string | symbol
): ParamMetadata[] {
  return Reflect.getMetadata(PARAM_METADATA, target.prototype, methodName) || [];
}

export function getParamMetadataByIndex(
  target: Constructor,
  methodName: string | symbol,
  paramIndex: number
): ParamMetadata | undefined {
  const params = getParamMetadata(target, methodName);
  return params.find(p => p.index === paramIndex);
}

export function getHttpCode(
  target: Constructor,
  methodName: string | symbol
): number | undefined {
  return Reflect.getMetadata(HTTP_CODE_METADATA, target.prototype, methodName);
}

export function getGuards(
  target: Constructor,
  methodName?: string | symbol
): Function[] {
  if (methodName) {
    // Method-level guards
    const methodGuards = Reflect.getMetadata(GUARDS_METADATA, target.prototype, methodName) || [];
    // Controller-level guards
    const controllerGuards = Reflect.getMetadata(GUARDS_METADATA, target) || [];
    return [...controllerGuards, ...methodGuards];
  }
  // Controller-level only
  return Reflect.getMetadata(GUARDS_METADATA, target) || [];
}

export function getZodSchema(
  target: Constructor,
  methodName: string | symbol
): unknown {
  return Reflect.getMetadata(ZOD_SCHEMA_METADATA, target.prototype, methodName);
}

export function getClassMetadata<T = unknown>(
  metadataKey: symbol,
  target: Constructor
): T | undefined {
  return Reflect.getMetadata(metadataKey, target);
}

export function getMethodMetadata<T = unknown>(
  metadataKey: symbol,
  target: Constructor,
  methodName: string | symbol
): T | undefined {
  return Reflect.getMetadata(metadataKey, target.prototype, methodName);
}

export function hasClassMetadata(
  metadataKey: symbol,
  target: Constructor
): boolean {
  return Reflect.hasMetadata(metadataKey, target);
}

/**
 * Check if a method has specific metadata
 */
export function hasMethodMetadata(
  metadataKey: symbol,
  target: Constructor,
  methodName: string | symbol
): boolean {
  return Reflect.hasMetadata(metadataKey, target.prototype, methodName);
}

/**
 * Get all method names that have a specific metadata key
 */
export function getMethodsWithMetadata(
  metadataKey: symbol,
  target: Constructor
): (string | symbol)[] {
  const methods: (string | symbol)[] = [];
  const prototype = target.prototype;
  
  // Get all property names including symbols
  const propertyNames = Object.getOwnPropertyNames(prototype);
  const propertySymbols = Object.getOwnPropertySymbols(prototype);
  
  for (const name of [...propertyNames, ...propertySymbols]) {
    if (name !== 'constructor' && Reflect.hasMetadata(metadataKey, prototype, name)) {
      methods.push(name);
    }
  }
  
  return methods;
}
