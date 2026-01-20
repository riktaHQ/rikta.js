---
sidebar_position: 12
---

# API Reference

Complete API reference for `@riktajs/core` and related packages.

## Core Decorators

### @Controller()

Marks a class as a controller for handling HTTP requests.

```typescript
@Controller(path?: string)
```

**Parameters:**
- `path` (optional): Route prefix for all routes in the controller

**Example:**
```typescript
@Controller('/users')
export class UserController {}
```

### @Injectable()

Marks a class as injectable in the DI container.

```typescript
@Injectable(options?: InjectableOptions)
```

**Options:**
- `scope`: `'singleton'` | `'transient'` (default: `'singleton'`)

**Example:**
```typescript
@Injectable()
export class UserService {}

@Injectable({ scope: 'transient' })
export class RequestService {}
```

### @Autowired()

Injects a dependency into a property or constructor parameter.

```typescript
@Autowired(token?: InjectionToken)
```

**Example:**
```typescript
@Injectable()
export class UserController {
  @Autowired()
  private userService!: UserService;

  @Autowired(DATABASE_TOKEN)
  private database!: Database;
}
```

## HTTP Method Decorators

### @Get(), @Post(), @Put(), @Patch(), @Delete()

Define HTTP route handlers.

```typescript
@Get(path?: string)
@Post(path?: string)
@Put(path?: string)
@Patch(path?: string)
@Delete(path?: string)
@Options(path?: string)
@Head(path?: string)
```

**Example:**
```typescript
@Controller('/users')
export class UserController {
  @Get()
  findAll() {}

  @Get('/:id')
  findOne(@Param('id') id: string) {}

  @Post()
  create(@Body() data: CreateUserDto) {}
}
```

## Parameter Decorators

### @Param()

Extracts a route parameter.

```typescript
@Param(name?: string)
```

### @Query()

Extracts query parameters.

```typescript
@Query(nameOrSchema?: string | ZodSchema)
```

### @Body()

Extracts the request body.

```typescript
@Body(schema?: ZodSchema)
```

### @Req()

Injects the Fastify request object.

```typescript
@Req()
```

### @Res()

Injects the Fastify reply object.

```typescript
@Res()
```

### @Headers()

Extracts request headers.

```typescript
@Headers(name?: string)
```

**Examples:**
```typescript
@Get('/:id')
findOne(
  @Param('id') id: string,
  @Query('include') include: string,
  @Headers('authorization') auth: string,
  @Req() request: FastifyRequest,
) {}

@Post()
create(@Body(CreateUserSchema) data: CreateUserDto) {}
```

## Guards

### CanActivate Interface

```typescript
interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}
```

### @UseGuards()

Apply guards to a controller or route.

```typescript
@UseGuards(...guards: CanActivate[])
```

**Example:**
```typescript
@Controller('/admin')
@UseGuards(AuthGuard, RolesGuard)
export class AdminController {}
```

### ExecutionContext

Context object passed to guards.

```typescript
interface ExecutionContext {
  getRequest<T = FastifyRequest>(): T;
  getReply<T = FastifyReply>(): T;
  getMetadata<T>(key: string): T | undefined;
}
```

## Configuration

### AbstractConfigProvider

Base class for configuration providers.

```typescript
abstract class AbstractConfigProvider<T> {
  protected schema?: ZodSchema<T>;
  validate(): void;
}
```

### @ConfigProperty()

Decorator for configuration properties.

```typescript
@ConfigProperty(options?: ConfigPropertyOptions)
```

**Options:**
- `env`: Environment variable name
- `transform`: Transform function `(value: string) => any`

**Example:**
```typescript
export class AppConfig extends AbstractConfigProvider<Config> {
  @ConfigProperty({ env: 'PORT', transform: Number })
  port: number = 3000;
}
```

## Lifecycle Hooks

### @OnInit()

Called when the provider is initialized.

```typescript
@OnInit()
```

### @OnReady()

Called when the application is ready.

```typescript
@OnReady()
```

### @OnShutdown()

Called when the application is shutting down.

```typescript
@OnShutdown()
```

**Example:**
```typescript
@Injectable()
export class DatabaseService {
  @OnInit()
  async connect() {}

  @OnShutdown()
  async disconnect() {}
}
```

## Exceptions

### HttpException

Base class for HTTP exceptions.

```typescript
class HttpException extends Error {
  constructor(status: number, message: string);
  getStatus(): number;
}
```

### Built-in Exceptions

```typescript
BadRequestException         // 400
UnauthorizedException       // 401
ForbiddenException          // 403
NotFoundException           // 404
MethodNotAllowedException   // 405
ConflictException           // 409
UnprocessableEntityException // 422
InternalServerErrorException // 500
```

**Example:**
```typescript
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
```

## Container API

### InjectionToken

Create tokens for non-class dependencies.

```typescript
class InjectionToken<T> {
  constructor(name: string);
}
```

### Container

The DI container.

```typescript
interface Container {
  registerClass<T>(token: Constructor<T> | InjectionToken<T>, implementation: Constructor<T>): void;
  registerValue<T>(token: InjectionToken<T>, value: T): void;
  registerFactory<T>(token: InjectionToken<T>, factory: () => T): void;
  resolve<T>(token: Constructor<T> | InjectionToken<T>): T;
  clear(): void;
}
```

**Example:**
```typescript
import { container, InjectionToken } from '@riktajs/core';

const API_KEY = new InjectionToken<string>('api.key');
container.registerValue(API_KEY, 'my-secret-key');

const key = container.resolve(API_KEY);
```

## Application

### Rikta

Main application class.

```typescript
class Rikta {
  static create(options: RiktaOptions): Promise<Rikta>;
  listen(): Promise<void>;
  close(): Promise<void>;
  getPort(): number;
  getServer(): FastifyInstance;
}
```

### RiktaOptions

```typescript
interface RiktaOptions {
  port?: number;
  host?: string;
  autowired?: string[];
  fastifyOptions?: FastifyServerOptions;
  debug?: boolean;
}
```

**Example:**
```typescript
const app = await Rikta.create({
  port: 3000,
  host: '0.0.0.0',
  autowired: ['./src'],
  debug: true,
});

await app.listen();
```

## Metadata

### SetMetadata()

Set custom metadata on a route.

```typescript
function SetMetadata<T>(key: string, value: T): MethodDecorator & ClassDecorator;
```

**Example:**
```typescript
// Define decorator
const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// Use decorator
@Get('/admin')
@Roles('admin')
adminOnly() {}
```

## Registry

### Registry

Access registered providers and controllers.

```typescript
class Registry {
  static getAllProviders(): Constructor[];
  static getAllControllers(): Constructor[];
  static getProviderMetadata(target: Constructor): ProviderMetadata;
  static getControllerMetadata(target: Constructor): ControllerMetadata;
}
```

## TypeORM Integration

### @InjectRepository()

Inject a TypeORM repository.

```typescript
@InjectRepository(entity: EntityTarget)
```

**Example:**
```typescript
@Injectable()
export class UserService {
  @InjectRepository(User)
  private userRepository!: Repository<User>;
}
```

### initializeTypeOrm()

Initialize the TypeORM connection.

```typescript
function initializeTypeOrm(options: DataSourceOptions): Promise<DataSource>;
```

## Queue Integration

### @Processor()

Marks a class as a job processor for a specific queue. Supports full dependency injection via `@Autowired`.

```typescript
@Processor(queueName: string, options?: ProcessorOptions)
```

**Options:**
- `concurrency`: Number of concurrent jobs (default: `1`)
- `rateLimiter`: Rate limiting options `{ max: number, duration: number }`

**Example:**
```typescript
@Processor('email-queue', { concurrency: 5 })
export class EmailProcessor {
  @Autowired(MailerService)
  private mailer!: MailerService;
}
```

### @Process()

Marks a method as a job handler.

```typescript
@Process(jobName?: string)
```

**Example:**
```typescript
@Process('send-email')
async handleSendEmail(job: Job) {}

@Process() // Uses method name as job name
async processOrder(job: Job) {}
```

### Event Decorators

```typescript
@OnJobComplete()    // (job: Job, result: unknown) => void
@OnJobFailed()      // (job: Job | undefined, error: Error) => void
@OnJobProgress()    // (job: Job, progress: number | object) => void
@OnJobStalled()     // (jobId: string) => void
@OnWorkerReady()    // () => void
@OnWorkerError()    // (error: Error) => void
```

### QueueService

Service for adding jobs to queues.

```typescript
class QueueService {
  addJob<T>(queueName: string, jobName: string, data: T, options?: JobOptions): Promise<Job>;
  addJobs<T>(queueName: string, jobs: Array<{ name: string; data: T }>): Promise<Job[]>;
  addDelayedJob<T>(queueName: string, jobName: string, data: T, delay: number): Promise<Job>;
  addRepeatableJob<T>(queueName: string, jobName: string, data: T, repeat: RepeatOptions): Promise<Job>;
  getJob(queueName: string, jobId: string): Promise<Job | undefined>;
  getQueueStats(queueName: string): Promise<QueueStats>;
  pauseQueue(queueName: string): Promise<void>;
  resumeQueue(queueName: string): Promise<void>;
  clearQueue(queueName: string, status?: JobStatus): Promise<void>;
  getQueueNames(): string[];
}
```

**Injection:**
```typescript
import { QUEUE_SERVICE, QueueService } from '@riktajs/queue';

@Injectable()
export class MyService {
  @Autowired(QUEUE_SERVICE)
  private queueService!: QueueService;
}
```

## Swagger Integration

### setupSwagger()

Configure Swagger documentation.

```typescript
function setupSwagger(app: Rikta, options: SwaggerOptions): void;
```

### SwaggerOptions

```typescript
interface SwaggerOptions {
  title: string;
  description?: string;
  version?: string;
  path?: string;
  servers?: Array<{ url: string; description?: string }>;
  securityDefinitions?: Record<string, SecurityDefinition>;
}
```

### Swagger Decorators

```typescript
@ApiTags(...tags: string[])
@ApiOperation(options: OperationOptions)
@ApiResponse(options: ResponseOptions)
@ApiParam(options: ParamOptions)
@ApiQuery(options: QueryOptions)
@ApiBody(options: BodyOptions)
@ApiSecurity(name: string)
@ApiExcludeEndpoint()
```
