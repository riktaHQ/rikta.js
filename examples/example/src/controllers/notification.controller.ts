import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Autowired 
} from '@riktajs/core';
import { 
  NotificationStrategy, 
  NotificationFactory,
  NotificationChannel 
} from '../strategies';

/**
 * DTO for sending notifications
 */
interface SendNotificationDto {
  recipient: string;
  message: string;
  channel?: NotificationChannel;
}

/**
 * Notification Controller
 * 
 * Demonstrates the Strategy Pattern with Factory:
 * - Default strategy injection via abstract class
 * - Runtime strategy selection via factory
 * 
 * @example
 * ```bash
 * # Send via default channel (email - @Primary)
 * curl -X POST http://localhost:3000/notifications/send \
 *   -H "Content-Type: application/json" \
 *   -d '{"recipient": "user@example.com", "message": "Hello!"}'
 * 
 * # Send via specific channel
 * curl -X POST http://localhost:3000/notifications/send \
 *   -H "Content-Type: application/json" \
 *   -d '{"recipient": "+1234567890", "message": "Your OTP: 123456", "channel": "sms"}'
 * 
 * # Broadcast to all available channels
 * curl -X POST http://localhost:3000/notifications/broadcast \
 *   -H "Content-Type: application/json" \
 *   -d '{"recipient": "user123", "message": "Important announcement!"}'
 * 
 * # Check available channels
 * curl http://localhost:3000/notifications/channels
 * ```
 */
@Controller('/notifications')
export class NotificationController {
  /**
   * Default notification strategy - automatically resolved to @Primary (EmailStrategy)
   * This demonstrates abstract class injection without explicit token
   */
  @Autowired()
  private defaultStrategy!: NotificationStrategy;

  /**
   * Notification factory for runtime strategy selection
   */
  @Autowired()
  private factory!: NotificationFactory;

  /**
   * Get available notification channels
   */
  @Get('/channels')
  getChannels() {
    const allChannels = this.factory.getAllStrategies().map(s => ({
      channel: s.getChannel(),
      available: s.isAvailable(),
    }));

    return {
      channels: allChannels,
      availableChannels: this.factory.getAvailableChannels(),
      defaultChannel: this.defaultStrategy.getChannel(),
    };
  }

  /**
   * Send notification via default or specified channel
   */
  @Post('/send')
  async send(@Body() dto: SendNotificationDto) {
    const { recipient, message, channel } = dto;

    // Use specified channel or default strategy
    const strategy = channel 
      ? this.factory.getStrategy(channel)
      : this.defaultStrategy;

    if (!strategy.isAvailable()) {
      return {
        success: false,
        error: `Channel '${strategy.getChannel()}' is not available`,
        availableChannels: this.factory.getAvailableChannels(),
      };
    }

    const sent = await strategy.send(recipient, message);

    return {
      success: sent,
      channel: strategy.getChannel(),
      recipient,
    };
  }

  /**
   * Broadcast notification to all available channels
   */
  @Post('/broadcast')
  async broadcast(@Body() dto: Omit<SendNotificationDto, 'channel'>) {
    const { recipient, message } = dto;

    const strategies = this.factory.getAvailableStrategies();
    
    if (strategies.length === 0) {
      return {
        success: false,
        error: 'No notification channels available',
      };
    }

    const results = await Promise.all(
      strategies.map(async (strategy) => ({
        channel: strategy.getChannel(),
        sent: await strategy.send(recipient, message),
      }))
    );

    return {
      success: results.every(r => r.sent),
      results,
      recipient,
    };
  }

  /**
   * Check status of the notification system
   */
  @Get('/status')
  getStatus() {
    return {
      defaultStrategy: {
        name: this.defaultStrategy.constructor.name,
        channel: this.defaultStrategy.getChannel(),
        available: this.defaultStrategy.isAvailable(),
      },
      strategies: this.factory.getAllStrategies().map(s => ({
        name: s.constructor.name,
        channel: s.getChannel(),
        available: s.isAvailable(),
      })),
    };
  }
}
