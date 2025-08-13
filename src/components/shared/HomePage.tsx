'use client';

import { useState } from 'react';

// Type definitions
interface User {
  name: string;
  email: string;
  avatar: string;
}

interface Balance {
  usd: number;
  thb: number;
  exchangeRate: number;
}

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: Date;
}
import { useRouter } from 'next/navigation';
import { useDemoContext } from '@/contexts/DemoContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Plus, 
  DollarSign, 
  Coins, 
  TrendingUp, 
  User, 
  Settings, 
  LogOut,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface HomePageProps {
  isDemoMode?: boolean;
}

export default function HomePage({ isDemoMode = false }: HomePageProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Get demo context data (always call hook to follow Rules of Hooks)
  const demoContext = useDemoContext();
  let demoUser: User, demoBalance: Balance, recentTransactions: Transaction[];
  
  if (isDemoMode) {
    demoUser = demoContext.demoUser;
    demoBalance = demoContext.demoBalance;
    recentTransactions = demoContext.recentTransactions;
  } else {
    // Fallback data for authenticated users
    demoUser = {
      name: 'User',
      email: 'user@example.com',
      avatar: 'U'
    };
    demoBalance = {
      usd: 0,
      thb: 0,
      exchangeRate: 34.00
    };
    recentTransactions = [];
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    if (isDemoMode) {
      // Demo mode - just redirect
      router.push('/login?message=demo_ended');
    } else {
      // Real logout logic would go here
      try {
        // await logoutUser(); // Implement actual logout
        router.push('/login?message=logout_success');
      } catch {
        // Logout failed - error handled silently
      }
    }
    
    setIsLoggingOut(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Section */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {demoUser.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="font-semibold text-lg">Welcome back, {demoUser.name.split(' ')[0]}</h1>
                <p className="text-sm text-muted-foreground">
                  {isDemoMode ? 'Demo Account' : 'Personal Account'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Balance Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <BalanceCard
            title="USD Balance"
            amount={demoBalance.usd}
            currency="USD"
            subtitle={`≈ ${(demoBalance.usd * demoBalance.exchangeRate).toLocaleString()} THB`}
          />
          <BalanceCard
            title="THB Balance" 
            amount={demoBalance.thb}
            currency="THB"
            subtitle={`≈ ${(demoBalance.thb / demoBalance.exchangeRate).toLocaleString()} USD`}
          />
        </div>

        {/* Exchange Rate Card */}
        <ExchangeRateCard rate={demoBalance.exchangeRate} />

        {/* Recent Transactions */}
        <RecentTransactionsCard transactions={recentTransactions} />

        {/* Quick Stats */}
        <QuickStatsCard transactions={recentTransactions} />

        {/* Account Actions */}
        <AccountActionsCard 
          isDemoMode={isDemoMode} 
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      </main>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 w-full p-4 bg-background/95 border-t backdrop-blur-sm z-50">
        <div className="container mx-auto">
          <Button size="lg" className="w-full h-12 text-base font-medium">
            <Plus className="mr-2 h-5 w-5" />
            Add New Transaction
          </Button>
        </div>
      </div>
    </div>
  );
}

// Balance Card Component
interface BalanceCardProps {
  title: string;
  amount: number;
  currency: 'USD' | 'THB';
  subtitle: string;
}

function BalanceCard({ title, amount, currency, subtitle }: BalanceCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">
            {currency === 'USD' ? '$' : '฿'}{amount.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
      {/* Background decoration */}
      <div className="absolute top-2 right-2 opacity-10">
        {currency === 'USD' ? (
          <DollarSign className="h-8 w-8" />
        ) : (
          <Coins className="h-8 w-8" />
        )}
      </div>
    </Card>
  );
}

// Exchange Rate Card
function ExchangeRateCard({ rate }: { rate: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Exchange Rate</CardTitle>
          <Badge variant="secondary" className="font-mono">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-lg font-semibold">
              1 USD = {rate.toFixed(2)} THB
            </div>
            <p className="text-sm text-muted-foreground">
              Updated 2 minutes ago
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center text-green-600 text-sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              +0.15%
            </div>
            <p className="text-xs text-muted-foreground">24h change</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Transactions Card
function RecentTransactionsCard({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                {transaction.currency === 'USD' ? (
                  <ArrowUpRight className="h-4 w-4 text-destructive" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{transaction.description}</p>
                <p className="text-xs text-muted-foreground">{transaction.category}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">
                {transaction.currency === 'USD' ? '$' : '฿'}{transaction.amount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(transaction.date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Quick Stats Card
function QuickStatsCard({ transactions }: { transactions: Transaction[] }) {
  const totalUSD = transactions
    .filter(t => t.currency === 'USD')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalTHB = transactions
    .filter(t => t.currency === 'THB')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This Week</CardTitle>
        <CardDescription>Your spending summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">USD Spent</p>
            <p className="text-xl font-bold">${totalUSD.toFixed(2)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">THB Spent</p>
            <p className="text-xl font-bold">฿{totalTHB.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Account Actions Card
interface AccountActionsCardProps {
  isDemoMode: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function AccountActionsCard({ isDemoMode, onLogout, isLoggingOut }: AccountActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Account Settings</CardTitle>
        <CardDescription>
          Manage your account and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button variant="outline" className="w-full justify-start">
          <User className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <Settings className="mr-2 h-4 w-4" />
          App Settings
        </Button>
        <Separator />
        <Button
          variant="destructive"
          className="w-full justify-start"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut 
            ? 'Logging out...' 
            : isDemoMode 
              ? 'Exit Demo' 
              : 'Logout'
          }
        </Button>
      </CardContent>
    </Card>
  );
}
