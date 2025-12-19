import 'reflect-metadata';
import { CONTROLLER_METADATA, INJECTABLE_METADATA } from '../constants';
import { container } from '../container/container';
import { registry } from '../registry';

/**
 * Controller options
 */
export interface ControllerOptions {
  /** Route prefix for all routes in this controller */
  prefix?: string;
}

/**
 * @Controller() decorator
 * 
 * Marks a class as a controller that handles HTTP requests.
 * Controllers are automatically:
 * - Registered in the global registry for auto-discovery
 * - Injectable and registered in the DI container
 * 
 * @example
 * ```typescript
 * @Controller('/users')
 * class UserController {
 *   @Autowired()
 *   private userService!: UserService;
 * 
 *   @Get('/')
 *   getUsers() { return []; }
 * 
 *   @Get('/:id')
 *   getUser(@Param('id') id: string) { return { id }; }
 * }
 * ```
 */
export function Controller(prefixOrOptions?: string | ControllerOptions): ClassDecorator {
  return (target: Function) => {
    const prefix = typeof prefixOrOptions === 'string' 
      ? prefixOrOptions 
      : prefixOrOptions?.prefix ?? '';
    
    // Normalize prefix (ensure it starts with / if not empty)
    const normalizedPrefix = prefix 
      ? (prefix.startsWith('/') ? prefix : `/${prefix}`)
      : '';

    // Store controller metadata
    Reflect.defineMetadata(CONTROLLER_METADATA, { prefix: normalizedPrefix }, target);
    
    // Mark as injectable
    Reflect.defineMetadata(INJECTABLE_METADATA, { scope: 'singleton' }, target);
    
    // Register in DI container
    container.register(target as new (...args: unknown[]) => unknown, { scope: 'singleton' });
    
    // Auto-register in global registry for discovery
    registry.registerController(target as new (...args: unknown[]) => unknown);
  };
}
