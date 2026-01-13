/** TypeORM plugin types */

import type { DataSourceOptions } from 'typeorm';

export type DatabaseType = 
  | 'postgres' 
  | 'mysql' 
  | 'mariadb' 
  | 'sqlite' 
  | 'better-sqlite3'
  | 'mssql' 
  | 'oracle' 
  | 'mongodb';

/** Simplified TypeORM configuration for common scenarios. */
export interface TypeOrmConfig {
  type: DatabaseType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;

  /** Database name or path (for SQLite). */
  database?: string;

  /** Synchronize database schema on launch. WARNING: Dev only! */
  synchronize?: boolean;
  logging?: boolean;
  entities?: DataSourceOptions['entities'];
  migrations?: DataSourceOptions['migrations'];
  subscribers?: DataSourceOptions['subscribers'];

  /** Datasource name for multiple connections. @default 'default' */
  name?: string;
}

/** Options for creating a TypeORM provider. */
export interface TypeOrmProviderOptions {
  /** Direct DataSourceOptions (takes precedence over config). */
  dataSourceOptions?: DataSourceOptions;

  /** Auto-initialize connection. @default true */
  autoInitialize?: boolean;

  /** Retry connection on failure. @default false */
  retryAttempts?: number;

  /** Delay between retries in ms. @default 3000 */
  retryDelay?: number;
}

/** Re-export common TypeORM types. */
export type {
  DataSource,
  EntityManager,
  Repository,
  ObjectLiteral,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
  EntityTarget,
} from 'typeorm';

