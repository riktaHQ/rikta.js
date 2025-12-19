import 'reflect-metadata';
import type { ZodType } from 'zod';
import { PARAM_METADATA, ParamType } from '../constants';

/**
 * Parameter metadata structure
 */
export interface ParamMetadata {
  index: number;
  type: ParamType;
  key?: string;
  /** Optional Zod schema for validation and type inference */
  zodSchema?: ZodType<unknown>;
}

/**
 * Type guard to check if a value is a Zod schema
 * Uses duck typing to detect Zod schemas without importing the full library
 */
function isZodType(value: unknown): value is ZodType<unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    '_def' in value &&
    'safeParse' in value &&
    typeof (value as { safeParse: unknown }).safeParse === 'function'
  );
}

/**
 * Creates a type-safe parameter decorator factory with Zod schema support
 * 
 * Supports three overloads:
 * 1. @Decorator() - Inject the full value
 * 2. @Decorator('key') - Inject a specific property by key
 * 3. @Decorator(zodSchema) - Inject with validation and type inference
 */
function createParamDecorator(type: ParamType) {
  // Overload signatures for type inference
  function decorator(): ParameterDecorator;
  function decorator(key: string): ParameterDecorator;
  function decorator<T>(schema: ZodType<T>): ParameterDecorator;
  function decorator<T>(keyOrSchema?: string | ZodType<T>): ParameterDecorator {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
      if (propertyKey === undefined) return;
      
      // Get existing params or initialize empty array
      const existingParams: ParamMetadata[] = 
        Reflect.getMetadata(PARAM_METADATA, target.constructor, propertyKey) ?? [];
      
      // Determine if we have a key string or a Zod schema
      const isSchema = isZodType(keyOrSchema);
      
      // Build metadata object
      const metadata: ParamMetadata = {
        index: parameterIndex,
        type,
        key: isSchema ? undefined : keyOrSchema,
        zodSchema: isSchema ? keyOrSchema : undefined,
      };
      
      // Add this param
      existingParams.push(metadata);
      
      // Store updated params
      Reflect.defineMetadata(PARAM_METADATA, existingParams, target.constructor, propertyKey);
    };
  }
  
  return decorator;
}

/**
 * @Body() decorator - Injects the request body
 * 
 * Supports three modes:
 * 1. `@Body()` - Inject the entire request body
 * 2. `@Body('propertyName')` - Inject a specific property from the body
 * 3. `@Body(zodSchema)` - Validate and inject with type inference
 * 
 * @example
 * ```typescript
 * // Inject entire body (untyped)
 * @Post('/users')
 * createUser(@Body() data: unknown) { return data; }
 * 
 * // Inject specific property
 * @Post('/users')
 * createUser(@Body('name') name: string) { return { name }; }
 * 
 * // Validate with Zod schema (type-safe!)
 * const CreateUserSchema = z.object({ name: z.string(), email: z.string().email() });
 * @Post('/users')
 * createUser(@Body(CreateUserSchema) data: z.infer<typeof CreateUserSchema>) {
 *   // data is fully typed as { name: string; email: string }
 *   return data;
 * }
 * ```
 */
export const Body = createParamDecorator(ParamType.BODY);

/**
 * @Query() decorator - Injects query parameters
 * 
 * Supports three modes:
 * 1. `@Query()` - Inject all query parameters
 * 2. `@Query('paramName')` - Inject a specific query parameter
 * 3. `@Query(zodSchema)` - Validate and inject with type inference
 * 
 * @example
 * ```typescript
 * // Inject specific query param
 * @Get('/users')
 * getUsers(@Query('page') page: string) { return { page }; }
 * 
 * // Inject all query params
 * @Get('/users')
 * getUsers(@Query() query: Record<string, unknown>) { return query; }
 * 
 * // Validate with Zod schema
 * const PaginationSchema = z.object({ page: z.coerce.number(), limit: z.coerce.number() });
 * @Get('/users')
 * getUsers(@Query(PaginationSchema) query: z.infer<typeof PaginationSchema>) {
 *   // query is { page: number; limit: number }
 *   return query;
 * }
 * ```
 */
export const Query = createParamDecorator(ParamType.QUERY);

/**
 * @Param() decorator - Injects route parameters
 * 
 * Supports three modes:
 * 1. `@Param()` - Inject all route parameters
 * 2. `@Param('paramName')` - Inject a specific route parameter
 * 3. `@Param(zodSchema)` - Validate and inject with type inference
 * 
 * @example
 * ```typescript
 * // Inject specific param
 * @Get('/users/:id')
 * getUser(@Param('id') id: string) { return { id }; }
 * 
 * // Validate with Zod schema
 * const IdSchema = z.object({ id: z.string().uuid() });
 * @Get('/users/:id')
 * getUser(@Param(IdSchema) params: z.infer<typeof IdSchema>) {
 *   // params.id is validated as UUID
 *   return params;
 * }
 * ```
 */
export const Param = createParamDecorator(ParamType.PARAM);

/**
 * @Headers() decorator - Injects request headers
 * 
 * Supports three modes:
 * 1. `@Headers()` - Inject all headers
 * 2. `@Headers('headerName')` - Inject a specific header
 * 3. `@Headers(zodSchema)` - Validate and inject with type inference
 * 
 * @example
 * ```typescript
 * // Inject specific header
 * @Get('/protected')
 * getData(@Headers('authorization') auth: string) { return { auth }; }
 * 
 * // Validate with Zod schema
 * const AuthHeadersSchema = z.object({ authorization: z.string().startsWith('Bearer ') });
 * @Get('/protected')
 * getData(@Headers(AuthHeadersSchema) headers: z.infer<typeof AuthHeadersSchema>) {
 *   return headers;
 * }
 * ```
 */
export const Headers = createParamDecorator(ParamType.HEADERS);

/**
 * @Req() decorator - Injects the raw Fastify request object
 */
export const Req = createParamDecorator(ParamType.REQUEST);
export const Request = Req;

/**
 * @Res() decorator - Injects the raw Fastify reply object
 */
export const Res = createParamDecorator(ParamType.REPLY);
export const Reply = Res;

/**
 * @Ctx() decorator - Injects the full route context
 */
export const Ctx = createParamDecorator(ParamType.CONTEXT);
export const Context = Ctx;

