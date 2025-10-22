# Exchange Rate Sync Notifications

## Overview

The sync system can notify you via **Email**, **Slack**, or **Custom Webhooks** when:
- ❌ Sync fails
- ✅ Sync recovers after a failure
- ⚠️ Warnings occur (optional)

## Quick Setup

### Option 1: Slack (Recommended - Easiest)

1. **Create a Slack Incoming Webhook:**
   - Go to https://api.slack.com/messaging/webhooks
   - Click "Create New App" → "From scratch"
   - Name: "Exchange Rate Monitor"
   - Select your workspace
   - Click "Incoming Webhooks" → Enable
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., `#alerts` or `#finance`)
   - Copy the webhook URL

2. **Add to Vercel Environment Variables:**
   ```bash
   SYNC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

3. **Deploy:** Notifications will start automatically!

### Option 2: Email

1. **Choose an Email Service:**
   - [Resend](https://resend.com) (Recommended, 3k emails/month free)
   - [SendGrid](https://sendgrid.com)
   - [AWS SES](https://aws.amazon.com/ses/)

2. **For Resend (Example):**
   ```bash
   # Sign up at resend.com, get API key
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   SYNC_EMAIL_NOTIFICATIONS=true
   SYNC_EMAIL_RECIPIENTS=you@example.com,team@example.com
   ```

3. **Implement Email Sender** (update `src/lib/services/sync-notification-service.ts:120-150`):
   ```typescript
   private async sendEmailNotification(notification: SyncNotification): Promise<void> {
     try {
       await fetch('https://api.resend.com/emails', {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           from: 'alerts@yourdomain.com',
           to: this.config.emailRecipients,
           subject: notification.title,
           html: this.formatEmailHtml(notification)
         })
       });
     } catch (error) {
       console.error('Failed to send email:', error);
     }
   }
   ```

### Option 3: Custom Webhook

1. **Set Up Your Webhook Endpoint:**
   - Must accept POST requests
   - Receives JSON payload (see format below)

2. **Add to Environment Variables:**
   ```bash
   SYNC_WEBHOOK_URL=https://your-server.com/api/sync-alerts
   ```

## Environment Variables Reference

Add these to `.env.local` (local) or Vercel Environment Variables (production):

```bash
# === Slack Notifications ===
SYNC_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# === Email Notifications ===
SYNC_EMAIL_NOTIFICATIONS=true                 # Enable email
SYNC_EMAIL_RECIPIENTS=you@example.com,admin@example.com

# Email service API key (depends on your provider)
RESEND_API_KEY=re_xxxxxxxxxxxxx              # For Resend
# or
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx            # For SendGrid

# === Custom Webhook ===
SYNC_WEBHOOK_URL=https://your-server.com/api/sync-alerts

# === Notification Behavior (Optional) ===
SYNC_NOTIFY_ON_FAILURE=true                  # Default: true (notify on errors)
SYNC_NOTIFY_ON_SUCCESS=false                 # Default: false (don't notify on every success)
SYNC_NOTIFY_ON_RECOVERY=true                 # Default: true (notify when fixed after failure)
```

## Notification Payload Format

### Failure Notification
```json
{
  "type": "failure",
  "title": "❌ Exchange Rate Sync Failed",
  "message": "The scheduled exchange rate sync has failed: Sync timeout exceeded (270s)",
  "syncId": "uuid-of-sync-run",
  "timestamp": "2025-10-22T18:05:30.123Z",
  "details": {
    "syncType": "weekday_fast_sync",
    "dayOfWeek": "Tuesday",
    "error": {
      "name": "Error",
      "message": "Sync timeout exceeded (270s)",
      "stack": "Error: Sync timeout exceeded..."
    }
  }
}
```

### Success (Recovery) Notification
```json
{
  "type": "success",
  "title": "✅ Exchange Rate Sync Restored",
  "message": "Exchange rate sync is working again! Latest sync completed successfully.",
  "syncId": "uuid-of-sync-run",
  "timestamp": "2025-10-22T19:00:15.456Z",
  "details": {
    "newRatesInserted": 36,
    "ratesUpdated": 0,
    "gapsFilled": 2
  }
}
```

## What Gets Notified

### Automatically Notified
✅ **Sync Failures** - Any error during sync (weekday or Sunday)
- Timeout errors
- Network failures
- ECB API issues
- Database errors

✅ **Recovery After Failure** - First successful sync after one or more failures
- "Sync restored" message
- Includes stats from successful run

### NOT Notified (by default)
⏭️ **Successful Syncs** - Normal daily operations
- Set `SYNC_NOTIFY_ON_SUCCESS=true` to enable (not recommended - noisy)

⏭️ **Skipped Syncs** - Saturday skips, weekend handling
- These are expected behavior

## Slack Message Examples

### Failure
```
❌ Exchange Rate Sync Failed
────────────────────────────
Message: The scheduled exchange rate sync has failed:
         Sync timeout exceeded (270s)

Sync ID: abc-123-def
Time: 10/22/2025, 6:05:30 PM
────────────────────────────
Details:
{
  "syncType": "weekday_fast_sync",
  "dayOfWeek": "Tuesday",
  "error": {...}
}
```

### Recovery
```
✅ Exchange Rate Sync Restored
────────────────────────────
Message: Exchange rate sync is working again!
         Latest sync completed successfully.

Sync ID: abc-124-def
Time: 10/22/2025, 7:00:15 PM
────────────────────────────
Details:
{
  "newRatesInserted": 36,
  "ratesUpdated": 0,
  "gapsFilled": 2
}
```

## Testing Notifications

### Test Slack Integration
```bash
curl -X POST YOUR_SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test notification from Exchange Rate Sync System",
    "attachments": [{
      "color": "good",
      "text": "If you see this, Slack notifications are working!"
    }]
  }'
```

### Trigger Manual Sync (to test notifications)
```bash
# This will trigger a sync and send notifications if it fails
curl -X POST https://your-app.vercel.app/api/admin/sync/trigger \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

### Check Notification Logs
```sql
-- View recent notifications in database
SELECT
  log_level,
  message,
  details,
  created_at
FROM sync_logs
WHERE phase = 'notification'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Not Receiving Slack Notifications

1. **Check Environment Variable:**
   ```bash
   # In Vercel dashboard
   Settings → Environment Variables → SYNC_SLACK_WEBHOOK_URL
   ```

2. **Verify Webhook URL Format:**
   ```
   ✅ https://hooks.slack.com/services/T00/B00/xxxx
   ❌ https://hooks.slack.com (incomplete)
   ```

3. **Test Webhook Directly:**
   ```bash
   curl -X POST YOUR_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text":"Test"}'
   ```

4. **Check Logs:**
   - Vercel → Your Project → Deployments → View Function Logs
   - Search for "Slack notification sent" or "Failed to send Slack"

### Not Receiving Email Notifications

1. **Email service not implemented:**
   - By default, email notifications just log to console
   - You must implement the email sender in `sync-notification-service.ts`
   - See "Option 2: Email" section above

2. **Check API Key:**
   ```bash
   # Verify in Vercel
   echo $RESEND_API_KEY  # Should start with "re_"
   ```

3. **Domain Verification:**
   - Most email services require domain verification
   - Check your email provider's dashboard

### Notifications Working But Missing Details

- Check `sync_logs` table for full error details
- Notifications are logged even if external services fail
- Query: `SELECT * FROM sync_logs WHERE phase = 'notification'`

## Advanced: Custom Webhook Handler

Example webhook endpoint to receive notifications:

```typescript
// pages/api/sync-alerts.ts
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const notification = req.body;

  // Log to your monitoring service
  console.log('Sync notification:', notification);

  // Send to PagerDuty, Datadog, etc.
  if (notification.type === 'failure') {
    await sendToPagerDuty(notification);
  }

  // Store in your database
  await db.alerts.insert({
    type: notification.type,
    message: notification.message,
    timestamp: notification.timestamp
  });

  res.status(200).json({ received: true });
}
```

## Related Documentation

- [Sync Strategy](./sync-strategy.md) - Day-based sync approach
- [Slack Webhooks](https://api.slack.com/messaging/webhooks) - Slack setup
- [Resend API](https://resend.com/docs) - Email service
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If notifications aren't working:
1. Check Vercel Function Logs
2. Verify environment variables are set
3. Test webhooks manually (see Testing section)
4. Check `sync_logs` table for notification attempts
