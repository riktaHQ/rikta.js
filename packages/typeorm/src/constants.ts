/** Injection tokens for TypeORM services. Use with @Autowired. */

import { InjectionToken } from '@riktajs/core';
import type { DataSource, EntityManager } from 'typeorm';

/** Injection token for the default TypeORM DataSource. */
export const TYPEORM_DATA_SOURCE = new InjectionToken<DataSource>('TYPEORM_DATA_SOURCE');

/** Injection token for the default TypeORM EntityManager. */
export const TYPEORM_ENTITY_MANAGER = new InjectionToken<EntityManager>('TYPEORM_ENTITY_MANAGER');

/** Token cache for multiple DataSources. */
const dataSourceTokenCache = new Map<string, InjectionToken<DataSource>>();
const entityManagerTokenCache = new Map<string, InjectionToken<EntityManager>>();

/**
 * Get or create a DataSource token for a named connection.
 * Returns TYPEORM_DATA_SOURCE for 'default'.
 */
export function getDataSourceToken(name: string = 'default'): InjectionToken<DataSource> {
  if (name === 'default') {
    return TYPEORM_DATA_SOURCE;
  }

  if (!dataSourceTokenCache.has(name)) {
    const token = new InjectionToken<DataSource>(`TYPEORM_DATA_SOURCE_${name.toUpperCase()}`);
    dataSourceTokenCache.set(name, token);
  }

  return dataSourceTokenCache.get(name)!;
}

/**
 * Get or create an EntityManager token for a named connection.
 * Returns TYPEORM_ENTITY_MANAGER for 'default'.
 */
export function getEntityManagerToken(name: string = 'default'): InjectionToken<EntityManager> {
  if (name === 'default') {
    return TYPEORM_ENTITY_MANAGER;
  }

  if (!entityManagerTokenCache.has(name)) {
    const token = new InjectionToken<EntityManager>(`TYPEORM_ENTITY_MANAGER_${name.toUpperCase()}`);
    entityManagerTokenCache.set(name, token);
  }

  return entityManagerTokenCache.get(name)!;
}

/** Clear the token cache (for testing). @internal */
export function clearTokenCache(): void {
  dataSourceTokenCache.clear();
  entityManagerTokenCache.clear();
}
