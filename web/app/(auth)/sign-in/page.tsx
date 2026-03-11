'use client'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Github, Loader2 } from "lucide-react"
import Link from "next/link"

const signInSchema = z.object({
  email: z.string().min(1, { message: '请输入邮箱地址' }).email('请输入有效的邮箱地址'),
  password: z.string().min(6, { message: '密码至少 6 位' }),
  remember: z.boolean().optional(),
})

type SignInFormValues = z.infer<typeof signInSchema>

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return String(error ?? 'Unknown error')
}

export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', remember: true },
  })

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          router.replace('/dashboard')
        }
      } catch (err) {
        console.error('Session check failed:', err)
      }
    }
    checkSession()
  }, [router, supabase.auth])

  async function signInWithEmail(values: SignInFormValues) {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password
      })

      if (error) throw error

      if (data?.session) {
        setSuccess('登录成功！正在跳转...')
        setTimeout(() => router.push('/dashboard'), 300)
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      if (message.includes('Invalid login credentials')) {
        setError('邮箱或密码错误')
      } else if (message.includes('fetch failed') || message.includes('Failed to fetch') || message.includes('SSL')) {
        setError('无法连接认证服务，请检查 NEXT_PUBLIC_SUPABASE_URL 或网络/代理设置')
      } else {
        setError(message || '登录失败')
      }
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGithub() {
    setLoading(true)
    setError('')

    try {
      // 动态获取当前域名，兼容本地和线上环境
      const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${origin}/auth/callback?next=/dashboard`,
          scopes: 'read:user user:email'
        }
      })

      if (error) throw error

      // Supabase will redirect automatically on success
      console.log('GitHub auth initiated, redirecting to:', data.url)

    } catch (error: unknown) {
      const message = getErrorMessage(error)
      console.error('GitHub login error:', error)
      if (message.includes('fetch failed') || message.includes('Failed to fetch') || message.includes('SSL')) {
        setError('GitHub 登录失败：无法连接认证服务，请检查 NEXT_PUBLIC_SUPABASE_URL 或网络/代理设置')
      } else {
        setError('GitHub 登录失败: ' + message)
      }
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2 atelier-app-bg atelier-grid-bg">
      <div className="hidden lg:flex flex-col justify-center items-center p-10 relative overflow-hidden border-r border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-cyan-400/10 z-0"></div>
        <div className="relative z-10 max-w-lg text-center">
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl">
              <FileText className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Welcome Back</h1>
          <p className="text-muted-foreground text-lg">
            Continue building your professional resume and land your dream job with our AI-powered tools.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 atelier-panel p-7 md:p-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Sign in to your account</h2>
            <p className="text-muted-foreground mt-2">Enter your details below to access your dashboard</p>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={signInWithGithub}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
              Continue with GitHub
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(signInWithEmail)} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                  <Link href="/reset" className="text-sm text-primary hover:underline">Forgot password?</Link>
                </div>
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
                Sign In
              </Button>
            </form>

            {(error || success) && (
              <div className={`p-3 rounded-md text-sm border ${error ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'}`}>
                {error || success}
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
