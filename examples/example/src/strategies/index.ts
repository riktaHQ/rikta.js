/**
 * Notification Strategies Module
 * 
 * This module demonstrates the Strategy Pattern with Abstract Class-Based DI:
 * 
 * 1. NotificationStrategy (abstract class) - The contract
 * 2. EmailStrategy (@Primary) - Default implementation
 * 3. SmsStrategy - Alternative implementation  
 * 4. PushStrategy - Alternative implementation
 * 5. NotificationFactory - Runtime strategy selection
 * 
 * Usage:
 * ```typescript
 * // Inject the abstract class - gets @Primary (EmailStrategy)
 * @Autowired()
 * private notification!: NotificationStrategy;
 * 
 * // Inject the factory for runtime selection
 * @Autowired()
 * private factory!: NotificationFactory;
 * ```
 */

export { NotificationStrategy } from './notification.strategy.js';
export { EmailStrategy } from './email.strategy.js';
export { SmsStrategy } from './sms.strategy.js';
export { PushStrategy } from './push.strategy.js';
export { NotificationFactory, NotificationChannel } from './notification.factory.js';
