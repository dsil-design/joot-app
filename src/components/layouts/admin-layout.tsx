import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Home,
  Activity
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <ReactQueryProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-spacing-4 py-spacing-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-spacing-4">
                <Link href="/home" className="text-2xl font-bold hover:opacity-80">
                  Joot
                </Link>
                <Badge variant="secondary">Admin Dashboard</Badge>
              </div>
              
              <nav className="flex items-center gap-spacing-6">
                <Link 
                  href="/admin/exchange-rates" 
                  className="text-sm hover:underline flex items-center gap-spacing-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Exchange Rates
                </Link>
                <Link 
                  href="/admin/users" 
                  className="text-sm hover:underline flex items-center gap-spacing-2"
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                <Link 
                  href="/admin/system" 
                  className="text-sm hover:underline flex items-center gap-spacing-2"
                >
                  <Activity className="h-4 w-4" />
                  System
                </Link>
                <Link 
                  href="/admin/logs" 
                  className="text-sm hover:underline flex items-center gap-spacing-2"
                >
                  <FileText className="h-4 w-4" />
                  Logs
                </Link>
                
                <div className="h-4 w-px bg-border" />
                
                <Button variant="outline" size="sm" asChild>
                  <Link href="/home">
                    <Home className="h-4 w-4 mr-spacing-2" />
                    Back to App
                  </Link>
                </Button>
              </nav>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-spacing-4 py-spacing-8">
          {children}
        </main>
        
        <footer className="border-t mt-spacing-16">
          <div className="container mx-auto px-spacing-4 py-spacing-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>Admin Dashboard - Joot Exchange Rate Management</p>
              <p>Last updated: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </footer>
      </div>
    </ReactQueryProvider>
  );
}