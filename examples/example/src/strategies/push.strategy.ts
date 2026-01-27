import { Injectable, Implements, Named } from '@riktajs/core';
import { NotificationStrategy } from './notification.strategy.js';

/**
 * Push Notification Strategy
 * 
 * Alternative implementation of NotificationStrategy for push notifications.
 * 
 * Can be injected by name: @Autowired(NotificationStrategy, 'push')
 */
@Injectable()
@Named('push')
@Implements(NotificationStrategy)
export class PushStrategy extends NotificationStrategy {
  private sentPush: Array<{ to: string; message: string; timestamp: Date }> = [];

  async send(recipient: string, message: string): Promise<boolean> {
    if (!this.isAvailable()) {
      this.log('Push notifications not available - FCM not configured');
      return false;
    }

    this.log(`Sending push notification to ${recipient}`);
    
    // Simulate push sending
    this.sentPush.push({
      to: recipient,
      message: this.formatMessage(message),
      timestamp: new Date(),
    });
    
    // In real app: await this.fcmService.send(...)
    return true;
  }

  isAvailable(): boolean {
    // Check if FCM is configured
    return process.env.FCM_ENABLED === 'true';
  }

  getChannel(): string {
    return 'push';
  }

  /**
   * Get all sent push notifications (for testing/debugging)
   */
  getSentPush(): Array<{ to: string; message: string; timestamp: Date }> {
    return [...this.sentPush];
  }
}
