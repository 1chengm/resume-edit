'use client'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'

export default function AuthCodeErrorPage() {
  const router = useRouter()
  const supabase = getSupabaseClient()

  async function retryGithub() {
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${site}/auth/callback?next=/dashboard` } })
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background-light dark:bg-background-dark p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-[#0f1720] p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0d141b] dark:text-slate-50">登录失败</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">未收到授权 code 或会话交换失败，请按如下步骤排查：</p>
        <ul className="mt-4 list-disc pl-5 text-sm text-slate-700 dark:text-slate-300">
          <li>在 Supabase Auth 设置中，确保 Site URL 为 <code>http://localhost:3000</code></li>
          <li>在 Redirect URLs 添加 <code>http://localhost:3000/auth/callback</code></li>
          <li>启用 GitHub Provider，并正确配置 Client ID 与 Client Secret</li>
          <li>本地环境变量已设置 <code>NEXT_PUBLIC_SUPABASE_URL</code> 与 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
        </ul>
        <div className="mt-6 flex gap-3">
          <button onClick={() => router.push('/sign-in')} className="h-10 rounded-lg bg-[#e5e7eb] px-4 text-[#0d141b] hover:bg-[#dfe3e7] dark:bg-slate-700 dark:text-slate-50">返回登录页</button>
          <button onClick={retryGithub} className="h-10 rounded-lg bg-primary px-4 text-white hover:bg-primary/90">重试 GitHub 登录</button>
        </div>
        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">建议安装浏览器的 React Developer Tools 以提升调试体验。</p>
      </div>
    </div>
  )
}