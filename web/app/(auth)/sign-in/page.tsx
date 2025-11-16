'use client'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'

const signInSchema = z.object({
  email: z.string({ required_error: '请输入邮箱地址' }).email('请输入有效的邮箱地址'),
  password: z.string({ required_error: '请输入登录密码' }).min(6, '密码至少 6 位'),
  remember: z.boolean().optional(),
})

type SignInFormValues = z.infer<typeof signInSchema>

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default function SignInPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '', remember: true },
  })

  async function signInWithEmail(values: SignInFormValues) {
    setLoading(true)
    setError('')
    const client = getClient()
    if (!client) {
      setError('缺少 Supabase 配置，请设置环境变量')
      setLoading(false)
      return
    }
    const { error } = await client.auth.signInWithPassword({ email: values.email, password: values.password })
    if (error) setError(error.message)
    else router.push('/dashboard')
    setLoading(false)
  }

  async function signInWithGithub() {
    setLoading(true)
    setError('')
    const client = getClient()
    if (!client) { setError('缺少 Supabase 配置'); setLoading(false); return }
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { error } = await client.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${site}/auth/callback?next=/dashboard` } })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="relative flex min-h-svh w-full bg-[#f6f7f8]">
      <div className="grid min-h-svh w-full grid-cols-1 lg:grid-cols-2">
        <div className="relative hidden flex-col items-center justify-center gap-6 bg-slate-100 p-10 dark:bg-slate-900/50 lg:flex">
          <div className="absolute inset-0 z-0 bg-cover bg-center opacity-10" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuAKRvAzaLqhjXngIaqFKutk_d-jRO5PuKFZApXsCTZ6zJAYvsugwDPYUYA3wU_cwcE4v9XCDW1-oMfndWbHzILHa3FbgQGwE42H7JAkK6DDBcZ7RsAA2fPSmQrBvhDXotzQFVWRBSBgS1A53VQhdWrHyCLaeoIx4t8e_2TjGRwKmy1X97o350xJboUxj-lqh3Fm5Ep-2HBssAsRq8Js8CrioH6bRtA8cU7y8Nzs1z65Dh6H11bX24YjkDNV5Vg3Gyxss44L4_tDJO4)' }} />
          <div className="z-10 flex w-full max-w-md flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <span className="material-symbols-outlined text-white text-2xl">description</span>
              </div>
              <p className="text-xl font-bold text-[#0d141b]">ResumeCraft</p>
            </div>
            <div className="flex flex-col gap-4">
              <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] text-[#0d141b] dark:text-slate-50">打造你的职业故事</h1>
              <h2 className="text-base font-normal leading-normal text-slate-600 dark:text-slate-400">构建让人眼前一亮的简历，优化面向顶尖科技公司的职位。</h2>
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col items-center justify-center bg-background-light p-6 dark:bg-background-dark sm:p-10">
          <div className="flex w-full max-w-md flex-col items-stretch gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-[#0d141b] dark:text-slate-50">登录</h1>
              <p className="text-base font-normal text-slate-600 dark:text-slate-400">登录以继续访问你的账户</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">使用第三方登录</p>
              <button className="flex h-12 min-w-[84px] w-full cursor-pointer items-center justify-center gap-3 overflow-hidden rounded-lg bg-[#24292f] px-5 text-base font-bold leading-normal tracking-[0.015em] text-white" onClick={signInWithGithub} disabled={loading}>
                <span className="material-symbols-outlined">hub</span>
                <span>使用 GitHub 登录</span>
              </button>
            </div>
            <div className="flex items-center gap-4">
              <hr className="w-full border-slate-200 dark:border-slate-700" />
              <p className="flex-shrink-0 text-center text-sm font-normal leading-normal text-[#4c739a] dark:text-slate-500">或</p>
              <hr className="w-full border-[#e5e7eb]" />
            </div>
            <form className="flex flex-col gap-4" onSubmit={handleSubmit(signInWithEmail)}>
              <label className="flex flex-col gap-2">
                <p className="text-base font-medium text-[#0d141b]">邮箱</p>
                <input className="form-input flex h-14 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-[#cfdbe7] bg-background-light p-4 text-base font-normal leading-normal text-[#0d141b] placeholder:text-[#4c739a] focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-background-dark dark:text-slate-50 dark:focus:border-primary" placeholder="输入你的邮箱" {...register('email')} />
                {errors.email && <span className="text-sm text-red-500">请输入有效邮箱</span>}
              </label>
              <label className="flex flex-col gap-2">
                <p className="text-base font-medium text-[#0d141b]">密码</p>
                <input className="h-12 w-full rounded-lg border border-[#cfdbe7] bg-white px-4 text-base text-[#0d141b] placeholder:text-[#93a4b8] transition-all duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="输入你的密码" type="password" {...register('password')} />
                {errors.password && <span className="text-sm text-red-500">密码至少 6 位</span>}
              </label>
              <button type="submit" className="flex h-12 min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-primary px-5 text-base font-bold leading-normal tracking-[0.015em] text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background-light dark:focus:ring-offset-background-dark" disabled={loading}>登录</button>
            </form>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex items-center justify-between text-sm">
              <a href="/sign-up" className="text-primary hover:underline">没有账号？注册</a>
              <a href="/reset" className="text-primary hover:underline">忘记密码？</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}