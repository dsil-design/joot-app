'use client';

import React, { createContext, useContext } from 'react';

export interface Transaction {
  id: string;
  amount: number;
  currency: 'USD' | 'THB';
  category: string;
  description: string;
  date: Date;
  location: string;
  thbAmount?: number;
  usdAmount?: number;
  exchangeRate: number;
}

export interface DemoUser {
  name: string;
  email: string;
  avatar: string;
}

export interface DemoBalance {
  usd: number;
  thb: number;
  exchangeRate: number;
}

interface DemoContextType {
  isDemoMode: boolean;
  demoUser: DemoUser;
  demoTransactions: Transaction[];
  demoBalance: DemoBalance;
  recentTransactions: Transaction[];
}

const DemoContext = createContext<DemoContextType | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const demoTransactions: Transaction[] = [
    {
      id: "demo-1",
      amount: 25.50,
      currency: "USD",
      category: "Food & Drink",
      description: "Coffee at Starbucks",
      date: new Date(),
      location: "Bangkok, Thailand",
      thbAmount: 867.00,
      exchangeRate: 34.00
    },
    {
      id: "demo-2", 
      amount: 1200.00,
      currency: "THB",
      category: "Transportation",
      description: "Taxi to airport",
      date: new Date(Date.now() - 86400000),
      location: "Bangkok, Thailand",
      usdAmount: 35.29,
      exchangeRate: 34.00
    },
    {
      id: "demo-3",
      amount: 45.75,
      currency: "USD",
      category: "Shopping",
      description: "T-shirt from Uniqlo",
      date: new Date(Date.now() - 172800000),
      location: "Bangkok, Thailand",
      thbAmount: 1555.50,
      exchangeRate: 34.00
    },
    {
      id: "demo-4",
      amount: 850.00,
      currency: "THB",
      category: "Food & Drink",
      description: "Dinner at local restaurant",
      date: new Date(Date.now() - 259200000),
      location: "Bangkok, Thailand",
      usdAmount: 25.00,
      exchangeRate: 34.00
    },
    {
      id: "demo-5",
      amount: 120.00,
      currency: "USD",
      category: "Entertainment",
      description: "Movie tickets and snacks",
      date: new Date(Date.now() - 345600000),
      location: "Bangkok, Thailand",
      thbAmount: 4080.00,
      exchangeRate: 34.00
    }
  ];

  const demoData: DemoContextType = {
    isDemoMode: true,
    demoUser: {
      name: "Demo User",
      email: "demo@joot.app",
      avatar: "DU"
    },
    demoTransactions,
    demoBalance: {
      usd: 1247.83,
      thb: 42427.22,
      exchangeRate: 34.00
    },
    recentTransactions: demoTransactions.slice(0, 3)
  };

  return (
    <DemoContext.Provider value={demoData}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider');
  }
  return context;
}
