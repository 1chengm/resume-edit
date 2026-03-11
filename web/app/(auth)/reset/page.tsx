'use client'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'


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
    <div className="atelier-app-bg atelier-grid-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 p-7 atelier-panel">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">重置密码</h1>
          <p className="text-sm text-muted-foreground">输入账号邮箱，我们会发送重置链接。</p>
        </div>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 pl-9" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Button className="w-full h-11" onClick={sendReset} disabled={loading || !email}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          发送重置邮件
        </Button>
        {message && <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">{message}</p>}
        {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">{error}</p>}
        <div className="text-sm">
          <Link href="/sign-in" className="text-primary hover:underline">返回登录</Link>
        </div>
      </div>
    </div>
  )
}
