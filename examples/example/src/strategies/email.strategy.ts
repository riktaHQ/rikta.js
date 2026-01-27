import { Injectable, Implements, Primary, Named } from '@riktajs/core';
import { NotificationStrategy } from './notification.strategy.js';

/**
 * Email Notification Strategy
 * 
 * Primary implementation of NotificationStrategy.
 * This will be the default when injecting NotificationStrategy.
 * 
 * Can also be injected by name: @Autowired(NotificationStrategy, 'email')
 */
@Injectable()
@Primary()
@Named('email')
@Implements(NotificationStrategy)
export class EmailStrategy extends NotificationStrategy {
  private sentEmails: Array<{ to: string; message: string; timestamp: Date }> = [];

  async send(recipient: string, message: string): Promise<boolean> {
    this.log(`Sending email to ${recipient}`);
    
    // Simulate email sending
    this.sentEmails.push({
      to: recipient,
      message: this.formatMessage(message),
      timestamp: new Date(),
    });
    
    // In real app: await this.mailerService.send(...)
    return true;
  }

  isAvailable(): boolean {
    // In real app: check SMTP configuration
    return true;
  }

  getChannel(): string {
    return 'email';
  }

  /**
   * Get all sent emails (for testing/debugging)
   */
  getSentEmails(): Array<{ to: string; message: string; timestamp: Date }> {
    return [...this.sentEmails];
  }
}
