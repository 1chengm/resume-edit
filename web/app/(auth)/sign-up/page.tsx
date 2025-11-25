'use client'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Loader2 } from "lucide-react"
import Link from "next/link"


const signUpSchema = z.object({
  email: z.string().min(1, { message: 'Email is required' }).email('Invalid email address'),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
})

type SignUpFormValues = z.infer<typeof signUpSchema>

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onChange'
  })

  async function signUp(values: SignUpFormValues) {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error, data } = await supabase.auth.signUp({
        email: values.email,
        password: values.password
      })

      if (error) throw error

      setMessage(data.user ? 'Registration successful! Please check your email.' : 'Registration successful, please verify your email.')
    } catch (error: any) {
      setError(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center items-center bg-muted/30 p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 z-0"></div>
        <div className="relative z-10 max-w-lg text-center">
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl">
              <FileText className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Join ResumeCraft</h1>
          <p className="text-muted-foreground text-lg">
            Start your journey to a better career. Create unlimited resumes, access AI tools, and more.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Create an account</h2>
            <p className="text-muted-foreground mt-2">Enter your details below to get started</p>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSubmit(signUp)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                <Input
                  placeholder="name@example.com"
                  {...register('email')}
                  className="h-12"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="h-12"
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>

            {(error || message) && (
              <div className={`p-3 rounded-md text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-green-50 text-green-700'}`}>
                {error || message}
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}