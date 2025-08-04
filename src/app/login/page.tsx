"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/supabase/auth";

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  useEffect(() => {
    // Use searchParams to avoid unused variable warning
    // eslint-disable-next-line no-console
    searchParams.then(params => console.log('Login page search params:', params));
  }, [searchParams]);

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fix: Replace 'any' with proper types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: loginError } = await auth.signIn(
        formData.email,
        formData.password
      );

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (data.user) {
        // Redirect to dashboard on successful login
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-spacing-4 py-spacing-8 md:px-spacing-16">
        <div className="w-full max-w-sm space-y-spacing-6">
          {/* Logo */}
          <div className="space-y-spacing-2">
            <div className="h-10 w-24">
              {/* Joot Logo - Using text for now, can be replaced with actual logo */}
              <div className="bg-zinc-900 text-white px-spacing-3 py-spacing-1 rounded text-sm font-bold inline-block">
                JOOT
              </div>
            </div>
          </div>

          {/* Separator */}
          <Separator />

          {/* Header */}
          <div className="space-y-spacing-1">
            <h1 className="text-xl/bold text-foreground">
              Login
            </h1>
            <p className="text-sm/normal text-muted-foreground">
              Enter your details below to login
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form className="space-y-spacing-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-spacing-1">
              <Label htmlFor="email" className="text-sm/medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="hello@dsil.design"
                disabled={isLoading}
                className="h-10"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-spacing-1">
              <Label htmlFor="password" className="text-sm/medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="•••••••••"
                disabled={isLoading}
                className="h-10"
              />
            </div>

            {/* Login Button */}
            <Button 
              type="submit" 
              className="w-full h-9 bg-[#155dfc] hover:bg-[#155dfc]/90" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Log in'}
            </Button>

            {/* Secondary Actions */}
            <div className="pt-spacing-6 space-y-spacing-4">
              <Link 
                href="/signup" 
                className="block text-center text-sm text-[#155dfc] hover:text-[#155dfc]/80 font-medium"
              >
                Sign up
              </Link>
              <Link 
                href="/forgot-password" 
                className="block text-center text-sm text-[#155dfc] hover:text-[#155dfc]/80 font-medium"
              >
                Forgot password
              </Link>
            </div>
          </form>

          {/* Bottom Separator */}
          <Separator />

          {/* Copyright */}
          <div className="text-center">
            <p className="text-sm/normal text-muted-foreground">
              © 2025 DSIL Design
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Billboard */}
      <div className="hidden md:flex flex-1 p-spacing-4">
        <div 
          className="w-full rounded-xl border border-zinc-200 bg-gradient-to-br from-blue-400 via-blue-500 to-orange-400"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #fb923c 100%)'
          }}
        >
          {/* Gradient background - matches Figma design */}
        </div>
      </div>
    </div>
  );
}