import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { SystemHealthCard } from '@/components/admin/system-health-card';
import { DataQualityDashboard } from '@/components/admin/data-quality-dashboard';
import { SyncControls } from '@/components/admin/sync-controls';
import { RateExplorer } from '@/components/admin/rate-explorer';
import { SyncHistoryTable } from '@/components/admin/sync-history-table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default async function AdminExchangeRatesPage() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      redirect('/login?redirect=/admin/exchange-rates');
    }
    
    // For now, allow all authenticated users to access admin interface
    // In production, this would check a roles table or user metadata
    const isAdmin = true; // All users can access admin interface for testing

    return (
      <AdminLayout>
        <div className="space-y-spacing-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Exchange Rate Management</h1>
              <p className="text-muted-foreground mt-spacing-2">
                Monitor system health, manage synchronization, and explore exchange rate data
              </p>
            </div>
            <div className="flex items-center gap-spacing-2">
              <Badge variant="secondary">Admin Dashboard</Badge>
              <Badge variant="outline">Welcome, {user.email?.split('@')[0]}</Badge>
            </div>
          </div>
          
          {/* System Health Overview */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">System Health</h2>
            <SystemHealthCard />
          </section>
          
          {/* Data Quality Metrics */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">Data Quality</h2>
            <DataQualityDashboard />
          </section>
          
          {/* Manual Sync Controls */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">Sync Controls</h2>
            <SyncControls />
          </section>
          
          {/* Exchange Rate Explorer */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">Rate Explorer</h2>
            <RateExplorer />
          </section>
          
          {/* Recent Sync History */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">Sync History</h2>
            <SyncHistoryTable />
          </section>
          
          {/* Footer Info */}
          <div className="pt-spacing-8 border-t">
            <div className="text-sm text-muted-foreground">
              <p className="mb-spacing-2">
                <strong>System Information:</strong> This dashboard provides real-time monitoring and control 
                over the Joot exchange rate synchronization system.
              </p>
              <p className="mb-spacing-2">
                <strong>Data Sources:</strong> European Central Bank (ECB) for fiat currencies, CoinGecko for cryptocurrencies.
              </p>
              <p>
                <strong>Refresh Rates:</strong> System health updates every 30s, data quality every 60s, 
                sync history every 30s.
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
    
  } catch (error) {
    console.error('Admin page auth check failed:', error);
    redirect('/login?error=auth-failed');
  }
}