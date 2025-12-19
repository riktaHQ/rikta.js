import 'reflect-metadata';
import { ROUTES_METADATA, HTTP_CODE_METADATA } from '../constants';
import { HttpMethod, RouteDefinition } from '../types';

/**
 * Creates a route decorator for a specific HTTP method
 */
function createRouteDecorator(method: HttpMethod) {
  return (path: string = ''): MethodDecorator => {
    return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
      // Normalize path
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      
      // Get existing routes or initialize empty array
      const routes: RouteDefinition[] = 
        Reflect.getMetadata(ROUTES_METADATA, target.constructor) ?? [];
      
      // Add this route
      routes.push({
        method,
        path: normalizedPath === '/' ? '' : normalizedPath,
        handlerName: propertyKey,
      });
      
      // Store updated routes
      Reflect.defineMetadata(ROUTES_METADATA, routes, target.constructor);
      
      return descriptor;
    };
  };
}

/**
 * @Get() decorator - Handles HTTP GET requests
 * 
 * @example
 * ```typescript
 * @Get('/users')
 * getUsers() { return []; }
 * ```
 */
export const Get = createRouteDecorator('GET');

/**
 * @Post() decorator - Handles HTTP POST requests
 * 
 * @example
 * ```typescript
 * @Post('/users')
 * createUser(@Body() data: CreateUserDto) { return data; }
 * ```
 */
export const Post = createRouteDecorator('POST');

/**
 * @Put() decorator - Handles HTTP PUT requests
 */
export const Put = createRouteDecorator('PUT');

/**
 * @Patch() decorator - Handles HTTP PATCH requests
 */
export const Patch = createRouteDecorator('PATCH');

/**
 * @Delete() decorator - Handles HTTP DELETE requests
 */
export const Delete = createRouteDecorator('DELETE');

/**
 * @Options() decorator - Handles HTTP OPTIONS requests
 */
export const Options = createRouteDecorator('OPTIONS');

/**
 * @Head() decorator - Handles HTTP HEAD requests
 */
export const Head = createRouteDecorator('HEAD');

/**
 * @HttpCode() decorator - Sets the HTTP status code for a route
 * 
 * @example
 * ```typescript
 * @Post('/users')
 * @HttpCode(201)
 * createUser() { return { created: true }; }
 * ```
 */
export function HttpCode(statusCode: number): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(HTTP_CODE_METADATA, statusCode, target.constructor, propertyKey);
    return descriptor;
  };
}

