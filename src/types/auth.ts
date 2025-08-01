import { LoginFormData } from "@/lib/validations/auth"

export interface AuthError {
  message: string
  field?: keyof LoginFormData
}

export interface LoginResponse {
  success: boolean
  token?: string
  error?: AuthError
}

export interface LoginPageProps {
  searchParams?: {
    error?: string
    callbackUrl?: string
  }
}
