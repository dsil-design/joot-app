/**
 * Sync Notification Service
 * Handles notifications for sync failures and important events
 */

import { db } from '../supabase/database';
import { createClient } from '../supabase/server';

export interface NotificationConfig {
  emailEnabled: boolean;
  slackEnabled: boolean;
  webhookEnabled: boolean;
  emailRecipients: string[];
  slackWebhookUrl?: string;
  webhookUrl?: string;
  notifyOnFailure: boolean;
  notifyOnSuccess: boolean;
  notifyOnFirstSuccess: boolean; // After a failure
}

export interface SyncNotification {
  type: 'failure' | 'success' | 'warning';
  title: string;
  message: string;
  syncId: string;
  timestamp: string;
  details?: any;
}

export class SyncNotificationService {
  private config: NotificationConfig;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Send notification for sync failure
   */
  async notifyFailure(syncId: string, error: string, details?: any): Promise<void> {
    if (!this.config.notifyOnFailure) return;

    const notification: SyncNotification = {
      type: 'failure',
      title: '❌ Exchange Rate Sync Failed',
      message: `The scheduled exchange rate sync has failed: ${error}`,
      syncId,
      timestamp: new Date().toISOString(),
      details
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification for sync success (especially after failure)
   */
  async notifySuccess(syncId: string, statistics: any, wasAfterFailure = false): Promise<void> {
    const shouldNotify = wasAfterFailure ? this.config.notifyOnFirstSuccess : this.config.notifyOnSuccess;
    if (!shouldNotify) return;

    const notification: SyncNotification = {
      type: 'success',
      title: wasAfterFailure ? '✅ Exchange Rate Sync Restored' : '✅ Exchange Rate Sync Completed',
      message: wasAfterFailure 
        ? `Exchange rate sync is working again! Latest sync completed successfully.`
        : `Daily exchange rate sync completed: ${statistics.newRatesInserted} new rates, ${statistics.ratesUpdated} updated`,
      syncId,
      timestamp: new Date().toISOString(),
      details: statistics
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification for warnings (e.g., no new data)
   */
  async notifyWarning(syncId: string, warning: string, details?: any): Promise<void> {
    const notification: SyncNotification = {
      type: 'warning',
      title: '⚠️ Exchange Rate Sync Warning',
      message: warning,
      syncId,
      timestamp: new Date().toISOString(),
      details
    };

    await this.sendNotification(notification);
  }

  /**
   * Send notification through configured channels
   */
  private async sendNotification(notification: SyncNotification): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.config.emailEnabled && this.config.emailRecipients.length > 0) {
      promises.push(this.sendEmailNotification(notification));
    }

    if (this.config.slackEnabled && this.config.slackWebhookUrl) {
      promises.push(this.sendSlackNotification(notification));
    }

    if (this.config.webhookEnabled && this.config.webhookUrl) {
      promises.push(this.sendWebhookNotification(notification));
    }

    // Execute all notifications in parallel
    await Promise.allSettled(promises);

    // Log notification to database
    await this.logNotification(notification);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: SyncNotification): Promise<void> {
    try {
      // In a real implementation, you'd integrate with your email service
      // For now, we'll just log it
      console.log('📧 Email notification (not implemented):', {
        to: this.config.emailRecipients,
        subject: notification.title,
        body: notification.message
      });

      // Example integration with a service like Resend or SendGrid:
      /*
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'alerts@yourapp.com',
          to: this.config.emailRecipients,
          subject: notification.title,
          html: this.formatEmailHtml(notification)
        })
      });
      */

    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(notification: SyncNotification): Promise<void> {
    try {
      if (!this.config.slackWebhookUrl) return;

      const color = notification.type === 'failure' ? 'danger' : 
                   notification.type === 'warning' ? 'warning' : 'good';

      const payload = {
        text: notification.title,
        attachments: [{
          color,
          fields: [
            {
              title: 'Message',
              value: notification.message,
              short: false
            },
            {
              title: 'Sync ID',
              value: notification.syncId,
              short: true
            },
            {
              title: 'Time',
              value: new Date(notification.timestamp).toLocaleString(),
              short: true
            }
          ],
          ...(notification.details && {
            fields: [
              ...({
                title: 'Message',
                value: notification.message,
                short: false
              } as any),
              {
                title: 'Details',
                value: `\`\`\`${JSON.stringify(notification.details, null, 2)}\`\`\``,
                short: false
              }
            ]
          })
        }]
      };

      const response = await fetch(this.config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}`);
      }

      console.log('📢 Slack notification sent successfully');

    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: SyncNotification): Promise<void> {
    try {
      if (!this.config.webhookUrl) return;

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      console.log('🔗 Webhook notification sent successfully');

    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Log notification to database for audit
   */
  private async logNotification(notification: SyncNotification): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from('sync_logs').insert({
        sync_history_id: notification.syncId,
        log_level: notification.type === 'failure' ? 'error' : 
                  notification.type === 'warning' ? 'warning' : 'info',
        phase: 'notification',
        message: `${notification.title}: ${notification.message}`,
        details: notification.details
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Format email HTML content
   */
  private formatEmailHtml(notification: SyncNotification): string {
    const emoji = notification.type === 'failure' ? '❌' : 
                 notification.type === 'warning' ? '⚠️' : '✅';
                 
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: ${notification.type === 'failure' ? '#fee2e2' : notification.type === 'warning' ? '#fef3c7' : '#d1fae5'}; 
                     padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .title { font-size: 24px; margin: 0; color: ${notification.type === 'failure' ? '#dc2626' : notification.type === 'warning' ? '#d97706' : '#059669'}; }
            .message { font-size: 16px; line-height: 1.5; margin: 15px 0; }
            .details { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="title">${emoji} ${notification.title}</h1>
            </div>
            <div class="message">${notification.message}</div>
            ${notification.details ? `
              <div class="details">
                <strong>Details:</strong><br>
                <pre>${JSON.stringify(notification.details, null, 2)}</pre>
              </div>
            ` : ''}
            <div class="footer">
              <p><strong>Sync ID:</strong> ${notification.syncId}</p>
              <p><strong>Time:</strong> ${new Date(notification.timestamp).toLocaleString()}</p>
              <p>This is an automated message from the Joot Exchange Rate System.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Check if we should notify about success (after failure)
   */
  async shouldNotifySuccessAfterFailure(syncId: string): Promise<boolean> {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from('sync_history')
        .select('status')
        .order('started_at', { ascending: false })
        .limit(5);

      if (!data || data.length < 2) return false;

      // Check if the previous sync failed but current succeeded
      const [current, previous] = data;
      return current.status === 'completed' && previous.status === 'failed';

    } catch (error) {
      console.error('Failed to check failure history:', error);
      return false;
    }
  }
}

/**
 * Default notification configuration
 */
export const defaultNotificationConfig: NotificationConfig = {
  emailEnabled: false,
  slackEnabled: false,
  webhookEnabled: false,
  emailRecipients: [],
  notifyOnFailure: true,
  notifyOnSuccess: false,
  notifyOnFirstSuccess: true // Notify when sync recovers after failure
};

/**
 * Create notification service from environment variables
 */
export function createNotificationService(): SyncNotificationService {
  const config: NotificationConfig = {
    emailEnabled: process.env.SYNC_EMAIL_NOTIFICATIONS === 'true',
    slackEnabled: !!process.env.SYNC_SLACK_WEBHOOK_URL,
    webhookEnabled: !!process.env.SYNC_WEBHOOK_URL,
    emailRecipients: process.env.SYNC_EMAIL_RECIPIENTS?.split(',') || [],
    slackWebhookUrl: process.env.SYNC_SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SYNC_WEBHOOK_URL,
    notifyOnFailure: process.env.SYNC_NOTIFY_ON_FAILURE !== 'false',
    notifyOnSuccess: process.env.SYNC_NOTIFY_ON_SUCCESS === 'true',
    notifyOnFirstSuccess: process.env.SYNC_NOTIFY_ON_RECOVERY !== 'false'
  };

  return new SyncNotificationService(config);
}

// Export singleton for convenience
export const syncNotificationService = createNotificationService();