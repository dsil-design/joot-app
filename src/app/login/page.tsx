"use client";

import { login, signup } from './actions'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, User, Info } from 'lucide-react';

// Image assets from Figma
const imgPhoto16980440482342E7F6C4E6Aca = "http://localhost:3845/assets/12e5fb50abf63d0dc0bc372fb5830e8ee292640b.png";
const imgUserIcon = "http://localhost:3845/assets/7e353056b8650208a0e14c8a5a3242cc14b01c48.svg";
const imgUserIcon2 = "http://localhost:3845/assets/b82983d6c7dc554e7369dbbfb4417b70f6aad3c8.svg";



export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [alert, setAlert] = useState<{show: boolean, type: 'success' | 'info', message: string}>({
    show: false, 
    type: 'success', 
    message: ''
  });

  useEffect(() => {
    const message = searchParams.get('message');
    
    if (message === 'logout_success') {
      setAlert({
        show: true,
        type: 'success',
        message: 'You have been successfully logged out.'
      });
    }

    if (message) {
      const timer = setTimeout(() => {
        setAlert(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleDemoLogin = () => {
    if (formRef.current) {
      const emailInput = formRef.current.querySelector('input[name="email"]') as HTMLInputElement;
      const passwordInput = formRef.current.querySelector('input[name="password"]') as HTMLInputElement;
      
      if (emailInput && passwordInput) {
        emailInput.value = 'hello@dsil.design';
        passwordInput.value = 'R9bKtzm6RGJe';
        
        // Trigger form submission
        const submitButton = formRef.current.querySelector('button[formAction]') as HTMLButtonElement;
        if (submitButton) {
          submitButton.click();
        }
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex items-center justify-center px-[186px] py-[202px] flex-1">
        <div className="flex flex-col gap-6 max-w-96 w-full">
          {alert.show && (
            <Alert className={alert.type === 'success' 
              ? "border-green-500 bg-green-50" 
              : "border-blue-500 bg-blue-50"
            }>
              {alert.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Info className="h-4 w-4 text-blue-600" />
              )}
              <AlertTitle className={alert.type === 'success' 
                ? "text-green-800" 
                : "text-blue-800"
              }>
                {alert.type === 'success' ? 'Success' : 'Information'}
              </AlertTitle>
              <AlertDescription className={alert.type === 'success' 
                ? "text-green-700" 
                : "text-blue-700"
              }>
                {alert.message}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Welcome Container */}
          <div className="flex flex-col gap-2.5 items-center text-center w-full">
            <h1 className="text-[30px] font-bold leading-[36px] text-zinc-950">
              Welcome to Joot
            </h1>
            <p className="text-[16px] font-normal leading-[24px] text-[#71717b]">
              Log in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form ref={formRef} className="flex flex-col gap-4 w-full">
            {/* Email Field */}
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="email" className="text-[14px] font-medium leading-[20px] text-zinc-950">
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="bg-white h-10 w-full rounded-md border border-zinc-200 px-3 py-2 text-[14px] font-normal leading-[20px] text-[#71717b] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue="hello@dsil.design"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1 w-full">
              <label htmlFor="password" className="text-[14px] font-medium leading-[20px] text-zinc-950">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="bg-white h-10 w-full rounded-md border border-zinc-200 px-3 py-2 text-[14px] font-normal leading-[20px] text-[#71717b] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue="•••••••••"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 w-full">
              <button
                formAction={login}
                className="bg-[#155dfc] flex-1 h-9 flex items-center justify-center rounded-lg px-4 py-2 text-[14px] font-medium leading-[20px] text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Log In
              </button>
              <Link
                href="/signup"
                className="bg-white flex-1 h-9 flex items-center justify-center rounded-lg px-4 py-2 border border-zinc-200 text-[14px] font-medium leading-[20px] text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
              >
                Create account
              </Link>
            </div>
          </form>

          {/* Separators */}
          <div className="flex items-center gap-6 w-full">
            <div className="bg-zinc-200 h-px flex-1"></div>
            <span className="text-[14px] font-medium leading-[20px] text-[#71717b]">
              OR
            </span>
            <div className="bg-zinc-200 h-px flex-1"></div>
          </div>

          {/* Demo Login Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            className="bg-white h-9 w-full flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 border border-zinc-200 text-[14px] font-medium leading-[20px] text-zinc-900 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors"
          >
            <div className="relative w-5 h-5">
              <div className="absolute inset-[56.25%_18.75%_14.58%_18.75%]">
                <img
                  alt=""
                  className="block max-w-none w-full h-full"
                  loading="lazy"
                  src={imgUserIcon}
                />
              </div>
              <div className="absolute inset-[20.83%_37.5%_54.17%_37.5%]">
                <img
                  alt=""
                  className="block max-w-none w-full h-full"
                  loading="lazy"
                  src={imgUserIcon2}
                />
              </div>
            </div>
            Log in to Demo Account
          </button>
        </div>
      </div>

      {/* Right Panel - Background Image */}
      <div className="flex flex-col items-start justify-center p-4 flex-1">
        <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-orange-400 w-full max-w-[756px] h-full rounded-xl border border-zinc-200 relative overflow-hidden">
          {/* Gradient overlay to match Figma design */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 via-purple-500/60 to-orange-500/80"></div>
        </div>
      </div>
    </div>
  );
}