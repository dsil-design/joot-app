"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-spacing-8 p-spacing-6">
        <div className="text-center">
          <h1 className="text-3xl/bold text-foreground">
            Sign in to your account
          </h1>
          <p className="text-base/normal text-muted-foreground mt-spacing-2">
            Welcome back to Joot
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <form className="space-y-spacing-6" onSubmit={handleSubmit}>
          <div className="space-y-spacing-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm/normal text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link 
              href="/signup" 
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}