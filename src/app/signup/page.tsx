"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/supabase/auth";

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

export default function SignupPage({ searchParams }: SignupPageProps) {
  useEffect(() => {
    // Handle search params without logging
    searchParams.then(() => {
      // Search params handled
    });
  }, [searchParams]);

  const router = useRouter();
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      setError('All fields are required');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signupError } = await auth.signUp(
        formData.email,
        formData.password,
        {
          full_name: formData.fullName
        }
      );

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.user) {
        setSuccess('Account created successfully! Please check your email to verify your account.');
        // Clear form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: ''
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?message=Please check your email to verify your account');
        }, 3000);
      }
    } catch {
      // Handle signup error without console logging
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
            Create your account
          </h1>
          <p className="text-base/normal text-muted-foreground mt-spacing-2">
            Join Joot to start tracking your transactions
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        <form className="space-y-spacing-6" onSubmit={handleSubmit}>
          <div className="space-y-spacing-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                disabled={isLoading}
              />
            </div>

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
                placeholder="Enter your password (min. 8 characters)"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm/normal text-muted-foreground">
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
