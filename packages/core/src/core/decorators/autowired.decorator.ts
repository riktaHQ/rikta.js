import 'reflect-metadata';
import { INJECT_METADATA, AUTOWIRED_METADATA } from '../constants.js';
import { Token } from '../container/injection-token.js';

/**
 * Metadata for autowired parameters/properties
 */
export interface AutowiredMetadata {
  token: Token;
  index?: number;       // For constructor parameters
  propertyKey?: string; // For property injection
  optional?: boolean;   // If true, undefined is injected when not found
  name?: string;        // For named implementation injection
}

/**
 * @Autowired() decorator
 * 
 * Universal dependency injection decorator for both:
 * - Constructor parameters
 * - Class properties
 * 
 * Automatically infers the type when no token is provided.
 * 
 * @param token - Optional injection token (class, InjectionToken, string, or symbol)
 * @param name - Optional name for qualified injection of named implementations
 * 
 * @example Property injection (most common):
 * ```typescript
 * @Controller('/users')
 * export class UserController {
 *   @Autowired()
 *   private userService!: UserService;
 * 
 *   @Autowired(LOGGER)  // With token for interfaces
 *   private logger!: Logger;
 * }
 * ```
 * 
 * @example Named implementation injection:
 * ```typescript
 * @Controller()
 * export class MailController {
 *   @Autowired(Mailer, 'smtp')
 *   private smtpMailer!: Mailer;
 * 
 *   @Autowired(Mailer, 'sendgrid')
 *   private sendgridMailer!: Mailer;
 * }
 * ```
 * 
 * @example Constructor injection:
 * ```typescript
 * @Injectable()
 * class ApiService {
 *   constructor(
 *     @Autowired() private userService: UserService,
 *     @Autowired(CONFIG) private config: AppConfig,
 *     @Autowired(Mailer, 'smtp') private mailer: Mailer
 *   ) {}
 * }
 * ```
 */
export function Autowired(token?: Token, name?: string): ParameterDecorator & PropertyDecorator {
  return (
    target: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) => {
    if (typeof parameterIndex === 'number') {
      // Constructor parameter injection
      const paramTypes: (new (...args: unknown[]) => unknown)[] = 
        Reflect.getMetadata('design:paramtypes', target) ?? [];
      const inferredType = paramTypes[parameterIndex];
      const resolvedToken = token ?? inferredType;
      
      if (!resolvedToken) {
        throw new Error(
          `@Autowired() on constructor parameter ${parameterIndex} of ${(target as Function).name} ` +
          `could not infer type. Please provide a token explicitly.`
        );
      }
      
      const existingInjects: AutowiredMetadata[] = 
        Reflect.getMetadata(INJECT_METADATA, target) ?? [];
      
      existingInjects.push({
        token: resolvedToken as Token,
        index: parameterIndex,
        name,
      });
      
      Reflect.defineMetadata(INJECT_METADATA, existingInjects, target);
    } else if (propertyKey !== undefined) {
      // Property injection
      const inferredType = Reflect.getMetadata('design:type', target, propertyKey);
      const resolvedToken = token ?? inferredType;
      
      if (!resolvedToken) {
        throw new Error(
          `@Autowired() on ${target.constructor.name}.${String(propertyKey)} ` +
          `could not infer type. Please provide a token explicitly.`
        );
      }
      
      const existingAutowires: AutowiredMetadata[] = 
        Reflect.getMetadata(AUTOWIRED_METADATA, target.constructor) ?? [];
      
      existingAutowires.push({
        token: resolvedToken,
        propertyKey: String(propertyKey),
        name,
      });
      
      Reflect.defineMetadata(AUTOWIRED_METADATA, existingAutowires, target.constructor);
    }
  };
}

/**
 * @Optional() decorator
 * 
 * Marks an injection as optional. If the dependency is not found,
 * undefined will be injected instead of throwing an error.
 * 
 * @example Property injection:
 * ```typescript
 * @Controller()
 * export class AppController {
 *   @Optional()
 *   @Autowired()
 *   private analytics?: AnalyticsService;
 * }
 * ```
 * 
 * @example Constructor injection:
 * ```typescript
 * @Injectable()
 * class NotificationService {
 *   constructor(
 *     @Optional() @Autowired(SLACK) private slack?: SlackClient
 *   ) {}
 * }
 * ```
 */
export function Optional(): ParameterDecorator & PropertyDecorator {
  return (
    target: Object,
    propertyKey: string | symbol | undefined,
    parameterIndex?: number
  ) => {
    if (typeof parameterIndex === 'number') {
      // Constructor parameter
      const existingInjects: AutowiredMetadata[] = 
        Reflect.getMetadata(INJECT_METADATA, target) ?? [];
      
      let meta = existingInjects.find(m => m.index === parameterIndex);
      
      if (meta) {
        meta.optional = true;
      } else {
        const paramTypes: (new (...args: unknown[]) => unknown)[] = 
          Reflect.getMetadata('design:paramtypes', target) ?? [];
        const paramType = paramTypes[parameterIndex];
        
        if (paramType) {
          existingInjects.push({
            token: paramType as Token,
            index: parameterIndex,
            optional: true,
          });
        }
      }
      
      Reflect.defineMetadata(INJECT_METADATA, existingInjects, target);
    } else if (propertyKey !== undefined) {
      // Property injection
      const existingAutowires: AutowiredMetadata[] = 
        Reflect.getMetadata(AUTOWIRED_METADATA, target.constructor) ?? [];
      
      let meta = existingAutowires.find(m => m.propertyKey === String(propertyKey));
      
      if (meta) {
        meta.optional = true;
      } else {
        const propType = Reflect.getMetadata('design:type', target, propertyKey) as Token | undefined;
        
        if (propType) {
          existingAutowires.push({
            token: propType,
            propertyKey: String(propertyKey),
            optional: true,
          });
        }
      }
      
      Reflect.defineMetadata(AUTOWIRED_METADATA, existingAutowires, target.constructor);
    }
  };
}

