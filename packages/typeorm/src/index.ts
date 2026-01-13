/**
 * TypeORM integration for Rikta with automatic lifecycle management,
 * dependency injection, and Zod validation support.
 * @packageDocumentation
 */

export { 
  TYPEORM_DATA_SOURCE, 
  TYPEORM_ENTITY_MANAGER,
  // Multiple datasources helpers
  getDataSourceToken,
  getEntityManagerToken,
} from './constants.js';

export { 
  TypeOrmProvider, 
  createTypeOrmProvider,
  initializeTypeOrm,
  configureTypeOrm,
  // Multiple datasources
  createNamedTypeOrmProvider,
  getTypeOrmProvider,
  getAllTypeOrmProviders,
  initializeAllTypeOrmProviders,
  destroyAllTypeOrmProviders,
} from './providers/typeorm.provider.js';

export type { 
  TypeOrmModuleOptions 
} from './providers/typeorm.provider.js';

export type { 
  DatabaseType,
  TypeOrmProviderOptions 
} from './types.js';

// Re-export common TypeORM types for convenience
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
  InsertResult,
  UpdateResult,
  DeleteResult,
  SelectQueryBuilder,
  QueryRunner,
  DataSourceOptions,
  EntitySchema,
  MigrationInterface,
  QueryBuilder,
  TreeRepository,
  MongoRepository,
} from 'typeorm';

export {
  // Entity decorators
  Entity,
  ViewEntity,
  ChildEntity,
  
  // Column decorators
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  ObjectIdColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  Generated,
  VirtualColumn,
  
  // Relation decorators
  OneToOne,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  RelationId,
  
  // Tree decorators
  Tree,
  TreeParent,
  TreeChildren,
  TreeLevelColumn,
  
  // Index decorators
  Index,
  Unique,
  Check,
  Exclusion,
  
  // Subscriber decorators
  EventSubscriber,
  AfterLoad,
  BeforeInsert,
  AfterInsert,
  BeforeUpdate,
  AfterUpdate,
  BeforeRemove,
  AfterRemove,
  BeforeSoftRemove,
  AfterSoftRemove,
  BeforeRecover,
  AfterRecover,
  
  // Other decorators
  TableInheritance,
  EntityRepository,
} from 'typeorm';

export {
  BaseEntity,
  EntityNotFoundError,
  QueryFailedError,
  CannotExecuteNotConnectedError,
} from 'typeorm';
