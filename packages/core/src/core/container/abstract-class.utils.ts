/**
 * Abstract Class Utilities
 * 
 * Provides utilities for detecting and working with abstract classes
 * in the dependency injection system.
 * 
 * This enables the "Abstract Class as Contract" pattern where:
 * - Abstract classes serve as injection tokens (like interfaces, but exist at runtime)
 * - Concrete implementations extend abstract classes
 * - The container automatically resolves abstract → concrete mappings
 * 
 * @example
 * ```typescript
 * // Define abstract contract
 * abstract class NotificationStrategy {
 *   abstract send(to: string, message: string): Promise<void>;
 * }
 * 
 * // Implement concrete strategy
 * @Injectable()
 * @Implements(NotificationStrategy)
 * class EmailNotificationStrategy extends NotificationStrategy {
 *   async send(to: string, message: string): Promise<void> {
 *     // Send email...
 *   }
 * }
 * 
 * // Inject abstract class (auto-resolved to concrete)
 * @Controller()
 * class UserController {
 *   @Autowired()
 *   private notification!: NotificationStrategy;
 * }
 * ```
 */

import { Constructor } from '../types';

/**
 * Metadata key for storing abstract class implementations
 */
export const IMPLEMENTS_METADATA = Symbol('rikta:implements');

/**
 * Metadata key for marking primary implementation
 */
export const PRIMARY_METADATA = Symbol('rikta:primary');

/**
 * Check if a class is abstract
 * 
 * JavaScript doesn't have true abstract classes, but TypeScript compiles
 * abstract classes as regular functions. We detect "abstract-like" behavior
 * by checking if the class is designed to be extended (has abstract methods marker).
 * 
 * @param target - The class to check
 * @returns true if the class appears to be abstract
 */
export function isAbstractClass(target: unknown): target is Constructor {
  if (typeof target !== 'function') {
    return false;
  }
  
  // Check if class has the abstract marker metadata
  const isMarkedAbstract = Reflect.getMetadata(IMPLEMENTS_METADATA, target) === undefined 
    && Reflect.hasMetadata('abstract:class', target);
  
  // Also check prototype for abstract method markers
  if (isMarkedAbstract) {
    return true;
  }
  
  // For classes explicitly registered as abstract via AbstractClass decorator
  return Reflect.getMetadata('abstract:class', target) === true;
}

/**
 * Check if a class extends from another class (supports inheritance chain)
 * 
 * @param derived - The potential derived class
 * @param base - The potential base class
 * @returns true if derived extends base
 */
export function extendsFrom(derived: Constructor, base: Constructor): boolean {
  if (!derived || !base) {
    return false;
  }
  
  if (derived === base) {
    return false; // Same class doesn't count as extension
  }
  
  // Walk up the prototype chain
  let current = Object.getPrototypeOf(derived);
  
  while (current && current !== Function.prototype) {
    if (current === base) {
      return true;
    }
    current = Object.getPrototypeOf(current);
  }
  
  return false;
}

/**
 * Get the abstract class that a class implements (via @Implements decorator)
 * 
 * @param target - The class to check
 * @returns The abstract class token, or undefined
 */
export function getImplementedAbstract(target: Constructor): Constructor | undefined {
  return Reflect.getMetadata(IMPLEMENTS_METADATA, target);
}

/**
 * Check if a class is marked as primary implementation
 * 
 * @param target - The class to check
 * @returns true if marked with @Primary
 */
export function isPrimaryImplementation(target: Constructor): boolean {
  return Reflect.getMetadata(PRIMARY_METADATA, target) === true;
}

/**
 * Set the abstract class implementation metadata
 * 
 * @param target - The implementing class
 * @param abstractClass - The abstract class being implemented
 */
export function setImplementsMetadata(target: Constructor, abstractClass: Constructor): void {
  Reflect.defineMetadata(IMPLEMENTS_METADATA, abstractClass, target);
}

/**
 * Set the primary implementation metadata
 * 
 * @param target - The class to mark as primary
 */
export function setPrimaryMetadata(target: Constructor): void {
  Reflect.defineMetadata(PRIMARY_METADATA, true, target);
}

/**
 * Mark a class as abstract (for detection purposes)
 * 
 * @param target - The abstract class to mark
 */
export function markAsAbstract(target: Constructor): void {
  Reflect.defineMetadata('abstract:class', true, target);
}
