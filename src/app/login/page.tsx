"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import Image from "next/image"

// shadCN imports
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"

// Validation and types
import { loginSchema, type LoginFormData } from "@/lib/validations/auth"
import type { AuthError, LoginPageProps } from "@/types/auth"

// Auth imports
import { setAuthState, getAuthState } from "@/lib/auth"

// Figma assets
const logoSvg = "http://localhost:3845/assets/e9c7f3010ded9c26b43efbdfbe4cf8b418d55f2a.svg"
const backgroundImage = "http://localhost:3845/assets/12e5fb50abf63d0dc0bc372fb5830e8ee292640b.png"

export default function LoginPage({ searchParams }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<AuthError | null>(null)

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const authState = getAuthState()
    if (authState.isAuthenticated) {
      window.location.href = '/dashboard'
    }
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: ""
    }
  })

  const authenticateUser = async (email: string, password: string): Promise<any> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simple validation: valid email format and password ≥8 characters
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (emailRegex.test(email) && password.length >= 8) {
      return {
        success: true,
        user: {
          id: '1',
          email: email,
          name: 'User'
        },
        token: 'mock-jwt-token'
      }
    } else {
      return {
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password. Please try again.'
        }
      }
    }
  }

  const onSubmit = async (data: any) => {
    setIsLoading(true)
    setAuthError(null)

    try {
      const response = await authenticateUser(data.email, data.password)
      if (response.success) {
        console.log("Login successful:", data)
        // Set authentication state
        setAuthState(response.user)
        // Redirect to dashboard (test dashboard screen)
        window.location.href = "/dashboard"
      } else {
        setAuthError({
          message: response.error.message,
          field: "email"
        })
      }
    } catch (error) {
      setAuthError({
        message: "An error occurred during login. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setAuthError(null)
    
    try {
      // Simulate Google OAuth
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log("Google login initiated")
      // Implement Google OAuth logic here
    } catch (error) {
      setAuthError({
        message: "Google login failed. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-8">
        <div className="w-full max-w-sm space-y-6">


          {/* Separator */}
          <Separator className="w-full" />

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground leading-7">
              Login
            </h1>
            <p className="text-sm text-muted-foreground leading-5">
              Enter your details below to login
            </p>
          </div>

          {/* Error Alert */}
          {authError && (
            <Alert variant="destructive">
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="team@mynaui.com"
                className="h-10 rounded-[10px] border-input bg-white text-sm"
                {...register("email")}
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••"
                className="h-10 rounded-[10px] border-input bg-white text-sm"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
              />
              {errors.password && errors.password.type !== 'minLength' && (
                <p className="text-sm text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-10 bg-primary text-primary-foreground rounded-[10px] text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              disabled={isLoading || !isValid}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="w-full h-10 bg-white border-input rounded-[10px] text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : "Login with Google"}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Don't have an account?{' '}
              <a href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </a>
            </p>
            <a 
              href="/forgot-password" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot your password?
            </a>
          </div>
        </div>
      </div>

      {/* Right Panel - Background Image */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-4">
        <div 
          className="w-full h-full max-w-[756px] rounded-xl border border-input bg-slate-100 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${backgroundImage}')`,
            backgroundSize: '223.99% 100%',
            backgroundPosition: '50% 0%'
          }}
        />
      </div>
    </div>
  )
}
