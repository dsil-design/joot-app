"use client";

import { login } from './actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info, Eye, EyeOff, User } from 'lucide-react';
import { useGlobalAction } from '@/contexts/GlobalActionContext';



function LoginPageContent() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const { withGlobalAction } = useGlobalAction();
  const [alert, setAlert] = useState<{show: boolean, type: 'success' | 'info', message: string}>({
    show: false, 
    type: 'success', 
    message: ''
  });

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'logout_successful') {
      setAlert({
        show: true,
        type: 'success',
        message: 'You are logged out!'
      });
    }

    if (error === 'auth_failed') {
      setAlert({
        show: true,
        type: 'info',
        message: 'Please log in to access that page.'
      });
    }

    if (success || error) {
      const timer = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleDemoLogin = async () => {
    await withGlobalAction('demo-login', async () => {
      if (formRef.current) {
        const emailInput = formRef.current.querySelector('input[name="email"]') as HTMLInputElement;
        const passwordInput = formRef.current.querySelector('input[name="password"]') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          // Set the values
          emailInput.value = 'hello@dsil.design';
          passwordInput.value = 'R9bKtzm6RGJe';
          
          // Trigger input events to ensure React state is updated
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Add a small delay to show the populated fields and global disabled state
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Create FormData manually to ensure we have the correct values
          const formData = new FormData();
          formData.append('email', 'hello@dsil.design');
          formData.append('password', 'R9bKtzm6RGJe');
          
          // Debug: Log the form data to verify
          // eslint-disable-next-line no-console
          console.log('Demo login FormData:', {
            email: formData.get('email'),
            password: formData.get('password')
          });
          
          await login(formData);
        }
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Login Form */}
      <div className="flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-16 xl:px-24 py-8 sm:py-12 md:py-16 lg:py-24 flex-1">
        <div className="flex flex-col gap-6 w-full sm:max-w-96">
          {alert.show && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>
                {alert.type === 'success' ? 'Success' : 'Information'}
              </AlertTitle>
              <AlertDescription>
                {alert.message}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Welcome Container */}
          <div className="flex flex-col gap-2.5 items-center text-center w-full">
            <h1 className="text-[30px] font-bold leading-[36px] text-foreground">
              Welcome to Joot
            </h1>
            <p className="text-[16px] font-normal leading-[24px] text-muted-foreground">
              Log in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form ref={formRef} className="flex flex-col gap-4 w-full">
            {/* Email Field */}
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="email" className="text-[14px] font-medium leading-[20px] text-foreground">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your email"
              />
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="password" className="text-[14px] font-medium leading-[20px] text-foreground">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 w-full">
              <Button
                type="button"
                onClick={async () => {
                  const formData = new FormData(document.querySelector('form') as HTMLFormElement);
                  await withGlobalAction('login-form', async () => {
                    await login(formData);
                  });
                }}
                variant="default"
                className="flex-1"
              >
                Log In
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex-1"
              >
                <Link href="/signup">
                  Create account
                </Link>
              </Button>
            </div>
          </form>

          {/* Separators */}
          <div className="flex items-center gap-6 w-full">
            <div className="bg-border h-px flex-1"></div>
            <span className="text-[14px] font-medium leading-[20px] text-muted-foreground">
              OR
            </span>
            <div className="bg-border h-px flex-1"></div>
          </div>

          {/* Demo Login Button */}
          <Button
            type="button"
            onClick={handleDemoLogin}
            variant="outline"
            className="w-full"
          >
            <User className="h-4 w-4" />
            Log in to Demo Account
          </Button>

          {/* Documentation Link */}
          <div className="text-center">
            <Link 
              href="/docs" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View Design System Documentation
            </Link>
          </div>
        </div>
      </div>

      {/* Right Panel - Background Image */}
      <div className="hidden lg:flex flex-col items-start justify-center p-4 flex-1">
        <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-orange-400 w-full h-full rounded-xl border border-border relative overflow-hidden">
          {/* Gradient overlay to match Figma design */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 via-purple-500/60 to-orange-500/80"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}