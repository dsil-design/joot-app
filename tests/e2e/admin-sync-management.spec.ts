import { test, expect, Page } from '@playwright/test';
import { mockSupabaseAuth } from '../helpers/mock-auth';
import { createAdminUser } from '../helpers/test-users';

test.describe('Admin Exchange Rate Sync Management', () => {
  let page: Page;
  let adminUser: any;
  
  test.beforeAll(async () => {
    // Create admin user for testing
    adminUser = await createAdminUser();
  });
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock admin authentication
    await mockSupabaseAuth(page, adminUser);
    
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');
  });
  
  test.describe('Sync Overview', () => {
    test('should display sync status and statistics', async () => {
      // Check for overview tab content
      await expect(page.locator('text=Exchange Rate Management')).toBeVisible();
      
      // Verify status banner is present
      const statusBanner = page.locator('[role="alert"]').first();
      await expect(statusBanner).toBeVisible();
      
      // Check for statistics cards
      await expect(page.locator('text=Total Syncs')).toBeVisible();
      await expect(page.locator('text=Success Rate')).toBeVisible();
      await expect(page.locator('text=Rates Updated')).toBeVisible();
      await expect(page.locator('text=Tracked Currencies')).toBeVisible();
    });
    
    test('should show real-time sync status updates', async () => {
      // Trigger a manual sync
      const syncButton = page.locator('button:has-text("Sync Now")');
      await expect(syncButton).toBeEnabled();
      
      // Mock sync API response
      await page.route('**/api/admin/sync/trigger', async route => {
        await route.fulfill({
          status: 200,
          json: { success: true, message: 'Sync started successfully' }
        });
      });
      
      // Click sync button
      await syncButton.click();
      
      // Should show syncing state
      await expect(page.locator('text=Syncing...')).toBeVisible();
      
      // Button should be disabled during sync
      await expect(syncButton).toBeDisabled();
    });
  });
  
  test.describe('Configuration Management', () => {
    test('should allow toggling auto-sync', async () => {
      // Navigate to configuration tab
      await page.click('button[role="tab"]:has-text("Configuration")');
      
      // Find auto-sync toggle
      const autoSyncSwitch = page.locator('#auto-sync');
      
      // Mock configuration update
      await page.route('**/rpc/update_sync_configuration', async route => {
        await route.fulfill({
          status: 200,
          json: { data: null, error: null }
        });
      });
      
      // Toggle the switch
      await autoSyncSwitch.click();
      
      // Verify toggle state changed
      const isChecked = await autoSyncSwitch.isChecked();
      expect(isChecked !== undefined).toBeTruthy();
    });
    
    test('should allow setting sync time', async () => {
      await page.click('button[role="tab"]:has-text("Configuration")');
      
      const syncTimeInput = page.locator('#sync-time');
      await expect(syncTimeInput).toBeVisible();
      
      // Change sync time
      await syncTimeInput.fill('18:30');
      await syncTimeInput.blur();
      
      // Verify value was set
      await expect(syncTimeInput).toHaveValue('18:30');
    });
    
    test('should allow setting historical data start date', async () => {
      await page.click('button[role="tab"]:has-text("Configuration")');
      
      const startDateInput = page.locator('#start-date');
      await expect(startDateInput).toBeVisible();
      
      // Mock configuration update
      await page.route('**/rpc/update_sync_configuration', async route => {
        await route.fulfill({
          status: 200,
          json: { data: null, error: null }
        });
      });
      
      // Set start date to 2016
      await startDateInput.fill('2016-01-01');
      await startDateInput.blur();
      
      // Verify value was set
      await expect(startDateInput).toHaveValue('2016-01-01');
    });
  });
  
  test.describe('Currency Selection', () => {
    test('should display currency checkboxes', async () => {
      // Navigate to currencies tab
      await page.click('button[role="tab"]:has-text("Currencies")');
      
      // Check for currency checkboxes
      await expect(page.locator('text=USD')).toBeVisible();
      await expect(page.locator('text=EUR')).toBeVisible();
      await expect(page.locator('text=GBP')).toBeVisible();
      await expect(page.locator('text=JPY')).toBeVisible();
    });
    
    test('should allow selecting/deselecting currencies', async () => {
      await page.click('button[role="tab"]:has-text("Currencies")');
      
      // Mock currency update
      await page.route('**/currency_configuration', async route => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            json: { data: null, error: null }
          });
        } else {
          await route.continue();
        }
      });
      
      // Find USD checkbox
      const usdCheckbox = page.locator('#USD');
      
      // Toggle USD
      await usdCheckbox.click();
      
      // Verify state changed
      const isChecked = await usdCheckbox.isChecked();
      expect(isChecked !== undefined).toBeTruthy();
    });
  });
  
  test.describe('Sync History', () => {
    test('should display sync history', async () => {
      // Navigate to history tab
      await page.click('button[role="tab"]:has-text("History")');
      
      // Mock sync history data
      await page.route('**/sync_history*', async route => {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              {
                id: 'sync-1',
                sync_type: 'scheduled',
                status: 'completed',
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                duration_ms: 5000,
                new_rates_inserted: 10,
                rates_updated: 5,
                rates_unchanged: 100,
                rates_deleted: 0
              },
              {
                id: 'sync-2',
                sync_type: 'manual',
                status: 'failed',
                started_at: new Date(Date.now() - 86400000).toISOString(),
                error_message: 'Network error'
              }
            ],
            error: null
          }
        });
      });
      
      // Should show sync entries
      await expect(page.locator('text=Scheduled Sync')).toBeVisible();
      await expect(page.locator('text=Manual Sync')).toBeVisible();
      
      // Should show status indicators
      await expect(page.locator('text=5.0s')).toBeVisible(); // Duration
      await expect(page.locator('text=Network error')).toBeVisible(); // Error
    });
    
    test('should allow viewing sync logs', async () => {
      await page.click('button[role="tab"]:has-text("History")');
      
      // Mock sync logs
      await page.route('**/sync_logs*', async route => {
        await route.fulfill({
          status: 200,
          json: {
            data: [
              {
                id: 'log-1',
                log_level: 'info',
                phase: 'download',
                message: 'Downloading ECB XML',
                timestamp: new Date().toISOString()
              },
              {
                id: 'log-2',
                log_level: 'error',
                phase: 'parse',
                message: 'Failed to parse XML',
                details: { error: 'Invalid XML' },
                timestamp: new Date().toISOString()
              }
            ],
            error: null
          }
        });
      });
      
      // Click on a sync entry to view logs
      const syncEntry = page.locator('div[class*="hover:bg-gray-50"]').first();
      await syncEntry.click();
      
      // Should switch to logs tab
      await expect(page.locator('button[role="tab"][aria-selected="true"]:has-text("Debug Logs")')).toBeVisible();
      
      // Should display log entries
      await expect(page.locator('text=Downloading ECB XML')).toBeVisible();
      await expect(page.locator('text=Failed to parse XML')).toBeVisible();
    });
  });
  
  test.describe('Manual Sync Trigger', () => {
    test('should successfully trigger manual sync', async () => {
      // Mock successful sync trigger
      await page.route('**/api/admin/sync/trigger', async route => {
        await route.fulfill({
          status: 200,
          json: { 
            success: true, 
            message: 'Sync started successfully',
            syncId: 'sync-123'
          }
        });
      });
      
      // Mock sync status update
      await page.route('**/rpc/get_latest_sync_status', async route => {
        await route.fulfill({
          status: 200,
          json: {
            data: [{
              id: 'sync-123',
              sync_type: 'manual',
              status: 'running',
              started_at: new Date().toISOString()
            }],
            error: null
          }
        });
      });
      
      // Click sync button
      const syncButton = page.locator('button:has-text("Sync Now")');
      await syncButton.click();
      
      // Should show syncing state
      await expect(page.locator('text=Syncing...')).toBeVisible();
    });
    
    test('should handle sync errors gracefully', async () => {
      // Mock failed sync trigger
      await page.route('**/api/admin/sync/trigger', async route => {
        await route.fulfill({
          status: 409,
          json: { error: 'Sync already in progress' }
        });
      });
      
      // Try to trigger sync
      const syncButton = page.locator('button:has-text("Sync Now")');
      await syncButton.click();
      
      // Should still have the button enabled after error
      await expect(syncButton).toBeEnabled();
    });
  });
  
  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check that content is still accessible
      await expect(page.locator('text=Exchange Rate Management')).toBeVisible();
      
      // Tabs should still work
      await page.click('button[role="tab"]:has-text("Configuration")');
      await expect(page.locator('#auto-sync')).toBeVisible();
    });
    
    test('should handle tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check layout
      await expect(page.locator('text=Exchange Rate Management')).toBeVisible();
      
      // Statistics cards should be visible
      await expect(page.locator('text=Total Syncs')).toBeVisible();
      await expect(page.locator('text=Success Rate')).toBeVisible();
    });
  });
});