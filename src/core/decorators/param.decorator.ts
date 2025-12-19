import 'reflect-metadata';
import { PARAM_METADATA, ParamType } from '../constants';

/**
 * Parameter metadata structure
 */
export interface ParamMetadata {
  index: number;
  type: ParamType;
  key?: string;
}

/**
 * Creates a parameter decorator
 */
function createParamDecorator(type: ParamType) {
  return (key?: string): ParameterDecorator => {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
      if (propertyKey === undefined) return;
      
      // Get existing params or initialize empty array
      const existingParams: ParamMetadata[] = 
        Reflect.getMetadata(PARAM_METADATA, target.constructor, propertyKey) ?? [];
      
      // Add this param
      existingParams.push({
        index: parameterIndex,
        type,
        key,
      });
      
      // Store updated params
      Reflect.defineMetadata(PARAM_METADATA, existingParams, target.constructor, propertyKey);
    };
  };
}

/**
 * @Body() decorator - Injects the request body
 * 
 * @example
 * ```typescript
 * @Post('/users')
 * createUser(@Body({ schema: CreateUserDto }) data) { return data; }
 * 
 * @Post('/users')
 * createUser(@Body('name') name: string) { return { name }; }
 * ```
 */
export const Body = createParamDecorator(ParamType.BODY);

/**
 * @Query() decorator - Injects query parameters
 * 
 * @example
 * ```typescript
 * @Get('/users')
 * getUsers(@Query('page') page: string) { return { page }; }
 * 
 * @Get('/users')
 * getUsers(@Query() query: Record<string, unknown>) { return query; }
 * ```
 */
export const Query = createParamDecorator(ParamType.QUERY);

/**
 * @Param() decorator - Injects route parameters
 * 
 * @example
 * ```typescript
 * @Get('/users/:id')
 * getUser(@Param('id') id: string) { return { id }; }
 * ```
 */
export const Param = createParamDecorator(ParamType.PARAM);

/**
 * @Headers() decorator - Injects request headers
 * 
 * @example
 * ```typescript
 * @Get('/protected')
 * getData(@Headers('authorization') auth: string) { return { auth }; }
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

