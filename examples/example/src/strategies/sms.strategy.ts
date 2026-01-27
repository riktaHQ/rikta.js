import { Injectable, Implements, Named } from '@riktajs/core';
import { NotificationStrategy } from './notification.strategy.js';

/**
 * SMS Notification Strategy
 * 
 * Alternative implementation of NotificationStrategy for SMS messages.
 * 
 * Can be injected by name: @Autowired(NotificationStrategy, 'sms')
 */
@Injectable()
@Named('sms')
@Implements(NotificationStrategy)
export class SmsStrategy extends NotificationStrategy {
  private sentSms: Array<{ to: string; message: string; timestamp: Date }> = [];

  async send(recipient: string, message: string): Promise<boolean> {
    if (!this.isAvailable()) {
      this.log('SMS not available - Twilio not configured');
      return false;
    }

    this.log(`Sending SMS to ${recipient}`);
    
    // Simulate SMS sending
    this.sentSms.push({
      to: recipient,
      message: this.formatMessage(message),
      timestamp: new Date(),
    });
    
    // In real app: await this.twilioService.sendSms(...)
    return true;
  }

  isAvailable(): boolean {
    // Check if Twilio is configured
    return process.env.TWILIO_ENABLED === 'true';
  }

  getChannel(): string {
    return 'sms';
  }

  /**
   * Get all sent SMS (for testing/debugging)
   */
  getSentSms(): Array<{ to: string; message: string; timestamp: Date }> {
    return [...this.sentSms];
  }
}
