import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { SystemHealthCard } from '@/components/admin/system-health-card';
import { DataQualityDashboard } from '@/components/admin/data-quality-dashboard';
import ExchangeRateManager from '@/components/admin/exchange-rate-manager';
import { Badge } from '@/components/ui/badge';
import { LogoutModal } from '@/components/logout-modal';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      redirect('/login?redirect=/admin/dashboard');
    }

    return (
      <AdminLayout>
        <div className="space-y-spacing-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-spacing-2">
                Monitor system health and manage exchange rate synchronization
              </p>
            </div>
            <div className="flex items-center gap-spacing-2">
              <Badge variant="secondary">Admin Dashboard</Badge>
              <Badge variant="outline">Welcome, {user.email?.split('@')[0]}</Badge>
              <LogoutModal>
                <Button variant="ghost" size="sm" className="h-8 px-3">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </LogoutModal>
            </div>
          </div>
          
          {/* System Health Overview */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">System Health</h2>
            <SystemHealthCard />
          </section>
          
          {/* Exchange Rate Management - Comprehensive Solution */}
          <section>
            <ExchangeRateManager />
          </section>
          
          {/* Data Quality Metrics */}
          <section>
            <h2 className="text-xl font-semibold mb-spacing-4">Data Quality</h2>
            <DataQualityDashboard />
          </section>
          
          {/* Footer Info */}
          <div className="pt-spacing-8 border-t">
            <div className="text-sm text-muted-foreground">
              <p className="mb-spacing-2">
                <strong>System Information:</strong> This dashboard provides real-time monitoring and control 
                over the Joot exchange rate synchronization system.
              </p>
              <p>
                <strong>Data Sources:</strong> European Central Bank (ECB) for fiat currencies, CoinGecko for cryptocurrencies.
              </p>
              <p>
                <strong>Auto-Refresh:</strong> Dashboard metrics update automatically to show the latest system status.
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