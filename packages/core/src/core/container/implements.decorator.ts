import 'reflect-metadata';
import { Constructor, AnyConstructor } from '../types.js';
import { 
  setImplementsMetadata, 
  setPrimaryMetadata,
  markAsAbstract,
  IMPLEMENTS_METADATA 
} from './abstract-class.utils.js';
import { registry } from '../registry.js';

/**
 * @Implements() decorator
 * 
 * Marks a class as the implementation of an abstract class.
 * This enables automatic resolution of abstract class dependencies.
 * 
 * Use this decorator when you have an abstract class contract and want
 * to specify which concrete class should be injected when the abstract
 * class is requested.
 * 
 * @param abstractClass - The abstract class that this class implements
 * 
 * @example Basic usage:
 * ```typescript
 * // Define abstract contract
 * abstract class PaymentGateway {
 *   abstract charge(amount: number): Promise<PaymentResult>;
 *   abstract refund(txId: string): Promise<void>;
 * }
 * 
 * // Implement with @Implements decorator
 * @Injectable()
 * @Implements(PaymentGateway)
 * export class StripeGateway extends PaymentGateway {
 *   async charge(amount: number): Promise<PaymentResult> {
 *     // Stripe implementation...
 *   }
 *   
 *   async refund(txId: string): Promise<void> {
 *     // Stripe refund...
 *   }
 * }
 * 
 * // Now you can inject PaymentGateway directly:
 * @Controller()
 * class CheckoutController {
 *   @Autowired()
 *   private gateway!: PaymentGateway; // Resolves to StripeGateway
 * }
 * ```
 * 
 * @example Multiple implementations with @Primary:
 * ```typescript
 * @Injectable()
 * @Implements(PaymentGateway)
 * @Primary() // This will be the default
 * export class StripeGateway extends PaymentGateway { }
 * 
 * @Injectable()
 * @Implements(PaymentGateway)
 * export class PayPalGateway extends PaymentGateway { }
 * ```
 */
export function Implements<T extends AnyConstructor>(abstractClass: T): ClassDecorator {
  return (target: Function) => {
    // Store metadata about which abstract class this implements
    setImplementsMetadata(target as Constructor, abstractClass as Constructor);
    
    // Mark the abstract class as abstract for detection
    markAsAbstract(abstractClass as Constructor);
    
    // Check if this class was already marked with @Named (decorator order flexibility)
    const name = Reflect.getMetadata('rikta:named', target) as string | undefined;
    
    // Register the mapping in the registry for auto-discovery
    registry.registerAbstractImplementation(abstractClass as Constructor, target as Constructor, name);
    
    // Check if this class was already marked as @Primary (decorator order flexibility)
    const isPrimary = Reflect.getMetadata('rikta:is-primary', target) === true;
    if (isPrimary) {
      registry.setPrimaryImplementation(abstractClass as Constructor, target as Constructor);
    }
  };
}

/**
 * @Primary() decorator
 * 
 * Marks an implementation as the primary/default when multiple implementations
 * exist for the same abstract class.
 * 
 * When the container encounters an abstract class with multiple implementations,
 * it will use the one marked with @Primary.
 * 
 * @example
 * ```typescript
 * abstract class Mailer {
 *   abstract send(to: string, body: string): Promise<void>;
 * }
 * 
 * @Injectable()
 * @Implements(Mailer)
 * @Primary() // This will be injected by default
 * export class SmtpMailer extends Mailer {
 *   async send(to: string, body: string): Promise<void> {
 *     // SMTP implementation
 *   }
 * }
 * 
 * @Injectable()
 * @Implements(Mailer)
 * export class SendGridMailer extends Mailer {
 *   async send(to: string, body: string): Promise<void> {
 *     // SendGrid implementation
 *   }
 * }
 * 
 * // Injects SmtpMailer (the primary)
 * @Autowired()
 * private mailer!: Mailer;
 * ```
 */
export function Primary(): ClassDecorator {
  return (target: Function) => {
    setPrimaryMetadata(target as Constructor);
    
    // If already registered via @Implements, update the primary flag
    const abstractClass = Reflect.getMetadata(IMPLEMENTS_METADATA, target);
    if (abstractClass) {
      registry.setPrimaryImplementation(abstractClass, target as Constructor);
    }
    
    // Also store on the class itself so @Implements can check later
    Reflect.defineMetadata('rikta:is-primary', true, target);
  };
}

/**
 * @Named() decorator
 * 
 * Assigns a name to an implementation for qualified injection.
 * Use this when you have multiple implementations of the same abstract class
 * and want to inject a specific one by name.
 * 
 * @param name - The unique name for this implementation
 * 
 * @example
 * ```typescript
 * abstract class Mailer {
 *   abstract send(to: string, body: string): Promise<void>;
 * }
 * 
 * @Injectable()
 * @Implements(Mailer)
 * @Named('smtp')
 * export class SmtpMailer extends Mailer {
 *   async send(to: string, body: string): Promise<void> {
 *     // SMTP implementation
 *   }
 * }
 * 
 * @Injectable()
 * @Implements(Mailer)
 * @Named('sendgrid')
 * export class SendGridMailer extends Mailer {
 *   async send(to: string, body: string): Promise<void> {
 *     // SendGrid implementation
 *   }
 * }
 * 
 * // Inject specific implementation by name
 * @Controller()
 * class MailController {
 *   @Autowired(Mailer, 'smtp')
 *   private smtpMailer!: Mailer;
 * 
 *   @Autowired(Mailer, 'sendgrid')
 *   private sendgridMailer!: Mailer;
 * }
 * ```
 */
export function Named(name: string): ClassDecorator {
  return (target: Function) => {
    // Store the name on the class
    Reflect.defineMetadata('rikta:named', name, target);
    
    // If already registered via @Implements, update the name
    const abstractClass = Reflect.getMetadata(IMPLEMENTS_METADATA, target);
    if (abstractClass) {
      registry.setImplementationName(abstractClass, target as Constructor, name);
    }
  };
}

/**
 * @AbstractClass() decorator (optional)
 * 
 * Explicitly marks a class as abstract for the DI system.
 * This is usually not needed as the @Implements decorator
 * automatically marks the base class as abstract.
 * 
 * Use this when you want to ensure a class is recognized
 * as abstract even before any implementations are registered.
 * 
 * @example
 * ```typescript
 * @AbstractClass()
 * abstract class Repository<T> {
 *   abstract findById(id: string): Promise<T | null>;
 *   abstract save(entity: T): Promise<T>;
 * }
 * ```
 */
export function AbstractClass(): ClassDecorator {
  return (target: Function) => {
    markAsAbstract(target as Constructor);
  };
}
