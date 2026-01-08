---
sidebar_position: 1
---

# TypeORM

The `@riktajs/typeorm` package provides seamless integration between Rikta and [TypeORM](https://typeorm.io), with automatic connection management and lifecycle integration.

## Features

- 🔌 **Automatic Connection Management** - DataSource initializes on app start, closes on shutdown
- 💉 **Dependency Injection** - Inject `DataSource` and `EntityManager` via `@Autowired`
- ⚙️ **Programmatic Configuration** - Configure via `createTypeOrmProvider()` function
- 🔄 **Lifecycle Hooks** - Uses Rikta's `OnProviderInit` and `OnProviderDestroy`
- 📦 **Re-exported Decorators** - Import TypeORM decorators directly from this package
- 🎯 **Type-safe** - Full TypeScript support

## Installation

```bash
npm install @riktajs/typeorm typeorm
```

You'll also need to install a database driver:

```bash
# PostgreSQL
npm install pg

# MySQL / MariaDB
npm install mysql2

# SQLite
npm install better-sqlite3

# Microsoft SQL Server
npm install mssql
```

## Quick Start

### 1. Create an Entity

```typescript
// entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from '@riktajs/typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ default: true })
  isActive!: boolean;
}
```

### 2. Create a Service

```typescript
// services/user.service.ts
import { Injectable, Autowired } from '@riktajs/core';
import { TYPEORM_DATA_SOURCE } from '@riktajs/typeorm';
import type { DataSource } from '@riktajs/typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  @Autowired(TYPEORM_DATA_SOURCE)
  private dataSource!: DataSource;

  async findAll(): Promise<User[]> {
    return this.dataSource.getRepository(User).find();
  }

  async findById(id: number): Promise<User | null> {
    return this.dataSource.getRepository(User).findOneBy({ id });
  }

  async create(name: string, email: string): Promise<User> {
    const user = new User();
    user.name = name;
    user.email = email;
    return this.dataSource.getRepository(User).save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    await this.dataSource.getRepository(User).update(id, data);
    return this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.dataSource.getRepository(User).delete(id);
    return (result.affected ?? 0) > 0;
  }
}
```

### 3. Use in a Controller

```typescript
// controllers/user.controller.ts
import { Controller, Get, Post, Body, Param, Autowired } from '@riktajs/core';
import { UserService } from '../services/user.service';

@Controller('/users')
export class UserController {
  @Autowired()
  private userService!: UserService;

  @Get('/')
  async listUsers() {
    return this.userService.findAll();
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return this.userService.findById(parseInt(id));
  }

  @Post('/')
  async createUser(@Body() body: { name: string; email: string }) {
    return this.userService.create(body.name, body.email);
  }
}
```

### 4. Bootstrap the Application

```typescript
// main.ts
import 'reflect-metadata';
import { Rikta } from '@riktajs/core';
import { initializeTypeOrm } from '@riktajs/typeorm';
import { User } from './entities/user.entity';

async function bootstrap() {
  // Initialize TypeORM (automatically connects and registers in DI container)
  const { installCleanup } = await initializeTypeOrm({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'admin',
    password: 'secret',
    database: 'myapp',
    entities: [User], // Register your entities
    synchronize: false, // Set to true only in development
    logging: true,
  });

  const app = await Rikta.create({
    port: 3000,
  });

  // Install automatic cleanup on app shutdown
  installCleanup(app);

  await app.listen();
}

bootstrap();
```

The `installCleanup(app)` call ensures that TypeORM connections are automatically closed when `app.close()` is called or when the process terminates gracefully.

The TypeORM connection is automatically initialized when the app starts and closed when it shuts down.

## Configuration

All configuration must be provided programmatically through the `createTypeOrmProvider` function.

### Basic Configuration

```typescript
import { createTypeOrmProvider } from '@riktajs/typeorm';
import { User } from './entities/user.entity';

const typeormProvider = createTypeOrmProvider({
  dataSourceOptions: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'admin',
    password: 'secret',
    database: 'myapp',
    entities: [User], // Always required
    synchronize: false, // Set to true only in development!
    logging: true,
  },
});
```

### Using Environment Variables

You can still use environment variables by reading them in your bootstrap code:

```typescript
const typeormProvider = createTypeOrmProvider({
  dataSourceOptions: {
    type: process.env.DB_TYPE as any,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [User, Post, Comment],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
  },
});
```

## Injection Tokens

Use these tokens to inject TypeORM instances:

| Token | Type | Description |
|-------|------|-------------|
| `TYPEORM_DATA_SOURCE` | `DataSource` | The TypeORM DataSource instance |
| `TYPEORM_ENTITY_MANAGER` | `EntityManager` | The EntityManager for the default connection |

### Using EntityManager

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { TYPEORM_ENTITY_MANAGER } from '@riktajs/typeorm';
import type { EntityManager } from '@riktajs/typeorm';

@Injectable()
export class TransactionService {
  @Autowired(TYPEORM_ENTITY_MANAGER)
  private entityManager!: EntityManager;

  async transferFunds(fromId: number, toId: number, amount: number) {
    await this.entityManager.transaction(async (manager) => {
      // All operations here run in a transaction
      await manager.decrement(Account, { id: fromId }, 'balance', amount);
      await manager.increment(Account, { id: toId }, 'balance', amount);
    });
  }
}
```

## Lifecycle Integration

The TypeORM provider integrates with Rikta's lifecycle system:

```
Rikta.create()
│
├─ Initialize providers (sorted by priority)
│   └─ TypeOrmProvider (priority: 100)
│       ├─ Build DataSourceOptions
│       ├─ Create DataSource
│       ├─ Call dataSource.initialize()
│       └─ Register in DI container
│
├─ ... other providers ...
│
app.close()
│
└─ Destroy providers (reverse order)
    └─ TypeOrmProvider
        └─ Call dataSource.destroy()
```

The TypeOrmProvider has a **priority of 100**, ensuring the database connection is established before other services that depend on it.

## Re-exported Decorators

For convenience, this package re-exports commonly used TypeORM decorators:

```typescript
import {
  // Entity
  Entity,
  ViewEntity,
  
  // Columns
  Column,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  VersionColumn,
  
  // Relations
  OneToOne,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  
  // Indexes
  Index,
  Unique,
  
  // Subscribers
  EventSubscriber,
  BeforeInsert,
  AfterInsert,
  BeforeUpdate,
  AfterUpdate,
} from '@riktajs/typeorm';
```

## Entity Relationships

### One-to-Many / Many-to-One

```typescript
// entities/post.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  JoinColumn,
  OneToMany 
} from '@riktajs/typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column()
  authorId!: number;

  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'authorId' })
  author!: User;
}

// Update user.entity.ts
@Entity('users')
export class User {
  // ... other columns

  @OneToMany(() => Post, post => post.author)
  posts!: Post[];
}
```

### Many-to-Many

```typescript
// entities/tag.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from '@riktajs/typeorm';
import { Post } from './post.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @ManyToMany(() => Post, post => post.tags)
  posts!: Post[];
}

// Update post.entity.ts
import { ManyToMany, JoinTable } from '@riktajs/typeorm';

@Entity('posts')
export class Post {
  // ... other columns

  @ManyToMany(() => Tag, tag => tag.posts)
  @JoinTable()
  tags!: Tag[];
}
```

## Query Builder

For complex queries, use QueryBuilder:

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { TYPEORM_DATA_SOURCE } from '@riktajs/typeorm';
import type { DataSource } from '@riktajs/typeorm';

@Injectable()
export class PostService {
  @Autowired(TYPEORM_DATA_SOURCE)
  private dataSource!: DataSource;

  async findWithFilters(filters: PostFilters): Promise<Post[]> {
    const query = this.dataSource
      .getRepository(Post)
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.tags', 'tags');

    if (filters.authorId) {
      query.andWhere('post.authorId = :authorId', { authorId: filters.authorId });
    }

    if (filters.tag) {
      query.andWhere('tags.name = :tag', { tag: filters.tag });
    }

    if (filters.search) {
      query.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    return query
      .orderBy('post.createdAt', 'DESC')
      .skip(filters.offset || 0)
      .take(filters.limit || 10)
      .getMany();
  }

  async getUserStats() {
    return this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user.isActive', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.isActive')
      .getRawMany();
  }
}
```

## Transactions

Handle transactions for data integrity:

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { TYPEORM_DATA_SOURCE } from '@riktajs/typeorm';
import type { DataSource } from '@riktajs/typeorm';

@Injectable()
export class OrderService {
  @Autowired(TYPEORM_DATA_SOURCE)
  private dataSource!: DataSource;

  async createOrder(data: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create order
      const order = queryRunner.manager.create(Order, data);
      await queryRunner.manager.save(order);

      // Update inventory
      for (const item of data.items) {
        await queryRunner.manager.decrement(
          Product,
          { id: item.productId },
          'stock',
          item.quantity
        );
      }

      // Process payment
      await this.paymentService.charge(order);

      await queryRunner.commitTransaction();
      return order;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

## Migrations

### Generate Migration

```bash
npx typeorm migration:generate -d ./src/data-source.ts ./migrations/CreateUsers
```

### Run Migrations

```bash
npx typeorm migration:run -d ./src/data-source.ts
```

### Revert Migration

```bash
npx typeorm migration:revert -d ./src/data-source.ts
```

### Migration Example

```typescript
// migrations/1234567890-CreateUsers.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1234567890 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

:::warning
Never use `synchronize: true` in production! Always use migrations for schema changes.
:::

## Subscribers

React to entity events:

```typescript
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from '@riktajs/typeorm';
import { User } from '../entities/user.entity';

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User;
  }

  beforeInsert(event: InsertEvent<User>) {
    console.log('Before user insert:', event.entity);
  }

  afterInsert(event: InsertEvent<User>) {
    console.log('User created:', event.entity.id);
    // Send welcome email, create audit log, etc.
  }

  afterUpdate(event: UpdateEvent<User>) {
    console.log('User updated:', event.entity?.id);
  }
}
```

## Multiple DataSources

Connect to multiple databases using named providers:

```typescript
import { 
  createNamedTypeOrmProvider, 
  getDataSourceToken,
} from '@riktajs/typeorm';

// Create providers for each database
const mainDb = createNamedTypeOrmProvider('main', {
  type: 'postgres',
  host: 'main-db.example.com',
  database: 'main',
  entities: [User, Post],
});

const analyticsDb = createNamedTypeOrmProvider('analytics', {
  type: 'postgres',
  host: 'analytics-db.example.com',
  database: 'analytics',
  entities: [Event, Metric],
});
```

Inject named datasources in your services:

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { getDataSourceToken } from '@riktajs/typeorm';
import type { DataSource } from '@riktajs/typeorm';

// Get tokens for named connections
const MAIN_DS = getDataSourceToken('main');
const ANALYTICS_DS = getDataSourceToken('analytics');

@Injectable()
export class AnalyticsService {
  @Autowired(ANALYTICS_DS)
  private analyticsDs!: DataSource;

  @Autowired(MAIN_DS)
  private mainDs!: DataSource;

  async trackEvent(userId: number, event: string) {
    // Get user from main database
    const user = await this.mainDs.getRepository(User).findOneBy({ id: userId });
    
    // Store event in analytics database
    await this.analyticsDs.getRepository(Event).save({
      userId: user?.id,
      event,
      timestamp: new Date(),
    });
  }
}
```

## Custom Repository Pattern

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { TYPEORM_DATA_SOURCE } from '@riktajs/typeorm';
import type { DataSource, Repository } from '@riktajs/typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  private repository!: Repository<User>;

  @Autowired(TYPEORM_DATA_SOURCE)
  set dataSource(ds: DataSource) {
    this.repository = ds.getRepository(User);
  }

  async findActive(): Promise<User[]> {
    return this.repository.find({
      where: { isActive: true },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOneBy({ email });
  }
}
```

## Best Practices

### 1. Use DTOs for Input/Output

Don't expose entities directly in your API responses:

```typescript
// ❌ Bad - exposes password
@Get('/:id')
async findOne(@Param('id') id: string) {
  return this.userService.findById(parseInt(id));
}

// ✅ Good - use DTOs
@Get('/:id')
async findOne(@Param('id') id: string) {
  const user = await this.userService.findById(parseInt(id));
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    // Password not included
  };
}
```

### 2. Use Eager/Lazy Loading Appropriately

```typescript
// Eager loading - loaded automatically
@ManyToOne(() => User, { eager: true })
author!: User;

// Lazy loading - loaded on access
@ManyToMany(() => Tag, { lazy: true })
tags!: Promise<Tag[]>;
```

### 3. Index Frequently Queried Columns

```typescript
import { Entity, Column, Index } from '@riktajs/typeorm';

@Entity('posts')
@Index(['authorId'])
@Index(['createdAt'])
export class Post {
  @Column()
  @Index()
  authorId!: number;

  @Column()
  @Index()
  createdAt!: Date;
}
```

### 4. Use Soft Deletes When Appropriate

```typescript
import { Entity, DeleteDateColumn } from '@riktajs/typeorm';

@Entity('users')
export class User {
  @DeleteDateColumn()
  deletedAt?: Date;
}

// Soft delete
await this.dataSource.getRepository(User).softDelete(id);

// Include soft-deleted
await this.dataSource.getRepository(User).find({ withDeleted: true });

// Restore soft-deleted
await this.dataSource.getRepository(User).restore(id);
```

### 5. Always Use Migrations in Production

```typescript
// ❌ Never in production
const typeormProvider = createTypeOrmProvider({
  dataSourceOptions: {
    // ...
    synchronize: true, // DON'T DO THIS!
  },
});

// ✅ Use migrations instead
const typeormProvider = createTypeOrmProvider({
  dataSourceOptions: {
    // ...
    synchronize: false,
    migrations: ['./migrations/*.ts'],
  },
});
```

### 6. Handle Connection Errors

```typescript
import { createTypeOrmProvider } from '@riktajs/typeorm';

const provider = createTypeOrmProvider({
  type: 'postgres',
  host: 'db.example.com',
  // ...
  retryAttempts: 3,      // Retry 3 times
  retryDelay: 5000,      // Wait 5 seconds between retries
});
```

## Testing

### Using SQLite for Tests

```typescript
import { createTypeOrmProvider } from '@riktajs/typeorm';
import { User } from '../entities/user.entity';

const testProvider = createTypeOrmProvider({
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: true,
  entities: [User],
  logging: false,
});

beforeAll(async () => {
  await testProvider.onProviderInit();
});

afterAll(async () => {
  await testProvider.onProviderDestroy();
});

test('should create a user', async () => {
  const ds = testProvider.getDataSource();
  const user = await ds.getRepository(User).save({
    name: 'Test User',
    email: 'test@example.com',
  });
  
  expect(user.id).toBeDefined();
  expect(user.name).toBe('Test User');
});
```

## Troubleshooting

### "DataSource is not initialized"

This error occurs when you try to use the DataSource before it's been initialized. Make sure:

1. Your service is decorated with `@Injectable()`
2. You're using `@Autowired(TYPEORM_DATA_SOURCE)` to inject the DataSource
3. You've provided `dataSourceOptions` when creating the TypeORM provider
4. The TypeORM provider is included in the `providers` array

### "No metadata for Entity was found"

This error means TypeORM doesn't know about your entity. Make sure:

1. You've registered the entity in the `entities` array of `dataSourceOptions`
2. You're importing the entity file before using it
3. The entity class is decorated with `@Entity()`

### Connection Refused

Check your database configuration:

```typescript
// Verify your connection details
const typeormProvider = createTypeOrmProvider({
  dataSourceOptions: {
    type: 'postgres',
    host: 'localhost', // Is this correct?
    port: 5432,        // Is the port correct?
    username: 'admin', // Valid credentials?
    password: 'secret',
    database: 'myapp', // Does this database exist?
    entities: [User],
  },
});
```

Make sure your database is running:

```bash
# PostgreSQL
psql -h localhost -p 5432 -U admin -d myapp

# MySQL
mysql -h localhost -P 3306 -u admin -p myapp
```

### Schema Synchronization Issues

:::warning
Never use `synchronize: true` in production! Use migrations instead.
:::

```bash
# Generate a migration
npx typeorm migration:generate -d ./data-source.ts ./migrations/CreateUsers

# Run migrations
npx typeorm migration:run -d ./data-source.ts
```

## Learn More

- [TypeORM Documentation](https://typeorm.io)
- [Rikta Configuration Guide](/docs/fundamentals/configuration)
- [Rikta Lifecycle](/docs/fundamentals/lifecycle-events)
- [@riktajs/typeorm on npm](https://www.npmjs.com/package/@riktajs/typeorm)
