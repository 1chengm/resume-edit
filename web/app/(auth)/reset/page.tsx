'use client'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'


export default function ResetPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function sendReset() {
    setLoading(true)
    setError('')
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${location.origin}/sign-in` : undefined
    })

    if (error) setError(error.message)
    else setMessage('重置邮件已发送,请检查邮箱')
    setLoading(false)
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-6 border rounded-xl bg-white">
        <h1 className="text-2xl font-bold">重置密码</h1>
        <input className="w-full h-10 border rounded-lg px-3" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        <button className="w-full h-10 rounded-lg bg-primary text-white font-bold" onClick={sendReset} disabled={loading}>发送重置邮件</button>
        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="text-sm"><a href="/sign-in" className="text-primary">返回登录</a></div>
      </div>
    </div>
  )
}