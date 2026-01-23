/**
 * Notification Strategy - Abstract Contract
 * 
 * This abstract class defines the contract for notification strategies.
 * Using abstract classes instead of interfaces enables:
 * - Runtime type checking
 * - Shared utility methods
 * - Automatic DI resolution via @Implements decorator
 * 
 * @example
 * ```typescript
 * // Inject the abstract class - auto-resolved to @Primary implementation
 * @Autowired()
 * private strategy!: NotificationStrategy;
 * ```
 */
export abstract class NotificationStrategy {
  /**
   * Send a notification to a recipient
   * @param recipient - The recipient identifier (email, phone, user ID, etc.)
   * @param message - The message content
   * @returns Promise resolving to true if sent successfully
   */
  abstract send(recipient: string, message: string): Promise<boolean>;

  /**
   * Check if this strategy is currently available
   * @returns true if the strategy can be used
   */
  abstract isAvailable(): boolean;

  /**
   * Get the strategy channel name
   * @returns The channel identifier
   */
  abstract getChannel(): string;

  /**
   * Shared utility method - available to all implementations
   * Logs a message with the strategy name prefix
   */
  protected log(message: string): void {
    console.log(`[${this.constructor.name}] ${message}`);
  }

  /**
   * Shared utility method - format a notification message
   */
  protected formatMessage(message: string, metadata?: Record<string, string>): string {
    if (!metadata) return message;
    
    let formatted = message;
    for (const [key, value] of Object.entries(metadata)) {
      formatted = formatted.replace(`{{${key}}}`, value);
    }
    return formatted;
  }
}
