"use client";

import { login } from './actions'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Info } from 'lucide-react';
import Image from 'next/image';
import { useGlobalAction } from '@/contexts/GlobalActionContext';

// Image assets from Figma
const imgUserIcon = "http://localhost:3845/assets/7e353056b8650208a0e14c8a5a3242cc14b01c48.svg";
const imgUserIcon2 = "http://localhost:3845/assets/b82983d6c7dc554e7369dbbfb4417b70f6aad3c8.svg";



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
    const message = searchParams.get('message');
    const error = searchParams.get('error');
    
    if (message === 'logout_success') {
      setAlert({
        show: true,
        type: 'success',
        message: 'You have been successfully logged out.'
      });
    }

    if (error === 'auth_failed') {
      setAlert({
        show: true,
        type: 'info',
        message: 'Please log in to access that page.'
      });
    }

    if (message || error) {
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
          emailInput.value = 'hello@dsil.design';
          passwordInput.value = 'R9bKtzm6RGJe';
          
          // Add a small delay to show the global disabled state
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Trigger form submission
          const submitButton = formRef.current.querySelector('button[formAction]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.click();
          }
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
            <Alert className={alert.type === 'success' 
              ? "border-green-600 bg-green-50" 
              : "border-border bg-muted"
            }>
              {alert.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground" />
              )}
              <AlertTitle className={alert.type === 'success' 
                ? "text-green-800" 
                : "text-foreground"
              }>
                {alert.type === 'success' ? 'Success' : 'Information'}
              </AlertTitle>
              <AlertDescription className={alert.type === 'success' 
                ? "text-green-700" 
                : "text-muted-foreground"
              }>
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
            className="w-full gap-1.5"
          >
            <div className="relative w-5 h-5">
              <div className="absolute inset-[56.25%_18.75%_14.58%_18.75%]">
                <Image
                  alt=""
                  className="block max-w-none w-full h-full"
                  src={imgUserIcon}
                  width={20}
                  height={20}
                />
              </div>
              <div className="absolute inset-[20.83%_37.5%_54.17%_37.5%]">
                <Image
                  alt=""
                  className="block max-w-none w-full h-full"
                  src={imgUserIcon2}
                  width={20}
                  height={20}
                />
              </div>
            </div>
            Log in to Demo Account
          </Button>
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