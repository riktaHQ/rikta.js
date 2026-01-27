import 'reflect-metadata';
import { INJECTABLE_METADATA } from '../constants.js';
import { InjectableOptions } from '../types.js';
import { container } from '../container/container.js';
import { registry } from '../registry.js';

/**
 * @Injectable() decorator
 * 
 * Marks a class as injectable, allowing it to be managed by the DI container.
 * Classes decorated with @Injectable() can be injected into other classes
 * via constructor injection or @Autowired() property injection.
 * 
 * The class is automatically registered in the global registry for lifecycle hooks.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class UserService {
 *   getUsers() { return []; }
 * }
 * 
 * @Injectable()
 * class UserController {
 *   constructor(private userService: UserService) {}
 * }
 * ```
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return (target: Function) => {
    // Store injectable metadata
    Reflect.defineMetadata(INJECTABLE_METADATA, options, target);
    
    // Register in DI container
    container.register(target as new (...args: unknown[]) => unknown, options);
    
    // Register in global registry for lifecycle hooks
    registry.registerProvider(target as new (...args: unknown[]) => unknown);
  };
}
