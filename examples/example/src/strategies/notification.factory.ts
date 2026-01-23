import { Injectable, Autowired } from '@riktajs/core';
import { NotificationStrategy } from './notification.strategy';
import { EmailStrategy } from './email.strategy';
import { SmsStrategy } from './sms.strategy';
import { PushStrategy } from './push.strategy';

/**
 * Notification Channel Type
 */
export type NotificationChannel = 'email' | 'sms' | 'push';

/**
 * Notification Factory
 * 
 * Factory pattern for selecting notification strategies at runtime.
 * Use this when you need to dynamically choose which strategy to use
 * based on user preferences, message type, or other runtime conditions.
 * 
 * This factory demonstrates two ways to get strategies:
 * 
 * 1. **Using the Factory** (this class):
 *    ```typescript
 *    const strategy = factory.getStrategy('sms');
 *    ```
 * 
 * 2. **Using @Named injection** (in services):
 *    ```typescript
 *    @Autowired(NotificationStrategy, 'sms')
 *    private smsNotifier!: NotificationStrategy;
 *    ```
 * 
 * @example
 * ```typescript
 * // Get specific strategy
 * const smsStrategy = this.factory.getStrategy('sms');
 * await smsStrategy.send(phone, 'Your OTP is 123456');
 * 
 * // Get all available strategies
 * const strategies = this.factory.getAvailableStrategies();
 * ```
 */
@Injectable()
export class NotificationFactory {
  // Method 1: Inject concrete classes directly (for type-safe access)
  @Autowired()
  private emailStrategy!: EmailStrategy;

  @Autowired()
  private smsStrategy!: SmsStrategy;

  @Autowired()
  private pushStrategy!: PushStrategy;

  // Method 2: Alternative - inject by name using abstract type
  // This is useful when you don't want to import concrete classes
  // @Autowired(NotificationStrategy, 'email')
  // private emailNotifier!: NotificationStrategy;
  //
  // @Autowired(NotificationStrategy, 'sms')
  // private smsNotifier!: NotificationStrategy;
  //
  // @Autowired(NotificationStrategy, 'push')
  // private pushNotifier!: NotificationStrategy;

  /**
   * Get a specific notification strategy by channel
   * @param channel - The notification channel
   * @returns The corresponding strategy
   */
  getStrategy(channel: NotificationChannel): NotificationStrategy {
    switch (channel) {
      case 'email':
        return this.emailStrategy;
      case 'sms':
        return this.smsStrategy;
      case 'push':
        return this.pushStrategy;
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  /**
   * Get all registered strategies
   * @returns Array of all notification strategies
   */
  getAllStrategies(): NotificationStrategy[] {
    return [this.emailStrategy, this.smsStrategy, this.pushStrategy];
  }

  /**
   * Get only the strategies that are currently available
   * @returns Array of available strategies
   */
  getAvailableStrategies(): NotificationStrategy[] {
    return this.getAllStrategies().filter(s => s.isAvailable());
  }

  /**
   * Get available channel names
   * @returns Array of available channel names
   */
  getAvailableChannels(): NotificationChannel[] {
    return this.getAvailableStrategies()
      .map(s => s.getChannel() as NotificationChannel);
  }

  /**
   * Check if a specific channel is available
   * @param channel - The channel to check
   * @returns true if the channel is available
   */
  isChannelAvailable(channel: NotificationChannel): boolean {
    return this.getStrategy(channel).isAvailable();
  }
}
