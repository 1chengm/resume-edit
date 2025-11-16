'use client'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default function SignUpPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>({ resolver: zodResolver(schema), mode: 'onChange' })

  async function signUp(values: { email: string; password: string }) {
    setLoading(true)
    setError('')
    setMessage('')
    const client = getClient()
    if (!client) { setError('缺少 Supabase 配置'); setLoading(false); return }
    const { error, data } = await client.auth.signUp({ email: values.email, password: values.password })
    if (error) setError(error.message)
    else setMessage(data.user ? '注册成功，已登录' : '注册成功，请前往邮箱完成验证')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-6 border rounded-xl bg-white">
        <h1 className="text-2xl font-bold">注册</h1>
        <form className="space-y-2" onSubmit={handleSubmit(signUp)}>
          <input className="w-full h-10 border rounded-lg px-3" placeholder="邮箱" {...register('email')} />
          {errors.email && <span className="text-sm text-red-500">请输入有效邮箱</span>}
          <input className="w-full h-10 border rounded-lg px-3" placeholder="密码" type="password" {...register('password')} />
          {errors.password && <span className="text-sm text-red-500">密码至少 6 位</span>}
          <button type="submit" className="w-full h-10 rounded-lg bg-primary text-white font-bold" disabled={loading}>注册</button>
        </form>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="text-sm"><a href="/sign-in" className="text-primary">已有账号？去登录</a></div>
      </div>
    </div>
  )
}