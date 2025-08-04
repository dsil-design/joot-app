"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Settings, Users, FolderOpen, Plus, Home, LogOut, User } from "lucide-react";
import { toast } from "sonner";

// UI components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Auth
import { auth } from "@/lib/supabase/auth";
import type { User as SupabaseUser } from "@/lib/supabase/types";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function DashboardPage({ searchParams }: DashboardPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line no-console
    searchParams.then(params => console.log('Search params:', params));
  }, [searchParams]);

  const loadUser = useCallback(async () => {
    try {
      const { data, error } = await auth.getUser();
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading user:', error);
        router.push('/login');
        return;
      }

      if (data.user) {
        // Get user profile from our users table
        const { user: profile, error: profileError } = await auth.getUserProfile(data.user.id);
        if (profileError) {
          // eslint-disable-next-line no-console
          console.error('Error loading user profile:', profileError);
          // Use basic user data from auth if profile fetch fails
          setUser({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || null,
            avatar_url: null,
            preferred_currency: 'USD',
            created_at: '',
            updated_at: ''
          } as SupabaseUser);
        } else {
          setUser(profile);
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error in loadUser:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await auth.signOut();
      if (error) {
        toast.error('Failed to sign out');
        // eslint-disable-next-line no-console
        console.error('Logout error:', error);
      } else {
        toast.success('Signed out successfully');
        router.push('/login');
      }
    } catch (error) {
      toast.error('An error occurred during sign out');
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.email} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getUserInitials(user.full_name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  variant="destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">1,234</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2" />
                Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">56</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">89%</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Item
          </Button>
        </div>
      </div>
    </div>
  );
}