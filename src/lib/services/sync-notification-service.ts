/**
 * Sync Notification Service
 * Handles notifications for sync failures and important events
 */

import { createClient } from '../supabase/server';

export interface NotificationConfig {
  slackEnabled: boolean;
  webhookEnabled: boolean;
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
  slackEnabled: false,
  webhookEnabled: false,
  notifyOnFailure: true,
  notifyOnSuccess: false,
  notifyOnFirstSuccess: true // Notify when sync recovers after failure
};

/**
 * Create notification service from environment variables
 */
export function createNotificationService(): SyncNotificationService {
  const config: NotificationConfig = {
    slackEnabled: !!process.env.SYNC_SLACK_WEBHOOK_URL,
    webhookEnabled: !!process.env.SYNC_WEBHOOK_URL,
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