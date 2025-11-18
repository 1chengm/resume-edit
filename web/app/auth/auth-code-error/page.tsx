'use client'
import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/src/lib/supabaseClient'

export default function AuthCodeErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()

  const error = searchParams.get('error')
  const details = searchParams.get('details')
  const timestamp = searchParams.get('timestamp')

  // 检查 URL 中是否有 access_token，如果有，尝试在客户端处理
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const hash = window.location.hash

    const accessToken = urlParams.get('access_token') ||
                      (hash.includes('access_token') ? new URLSearchParams(hash.substring(1)).get('access_token') : null)

    if (accessToken) {
      console.log('Found access token in URL, attempting client-side session setup...')
      // 尝试在客户端设置会话
      const setupSession = async () => {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hash ? new URLSearchParams(hash.substring(1)).get('refresh_token') : null
          })
          
          if (!error && data.user) {
            console.log('✅ Client-side session setup successful')
            router.push('/dashboard')
            return
          }
          
          console.error('❌ Client-side session setup failed:', error)
        } catch (err) {
          console.error('💥 Client-side session setup error:', err)
        }
      }
      
      setupSession()
    }
  }, [router, supabase.auth])

  async function retryGithub() {
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    try {
      await supabase.auth.signInWithOAuth({ 
        provider: 'github', 
        options: { 
          redirectTo: `${site}/auth/callback?next=/dashboard` 
        } 
      })
    } catch (error) {
      console.error('Failed to retry GitHub login:', error)
      alert('重试登录失败，请检查控制台错误信息')
    }
  }

  function goToSignIn() {
    router.push('/sign-in')
  }

  function goHome() {
    router.push('/')
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-background-light dark:bg-background-dark p-6">
      <div className="w-full max-w-xl rounded-xl border border-[#cfdbe7] dark:border-slate-700 bg-white dark:bg-[#0f1720] p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0d141b] dark:text-slate-50">登录遇到问题</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {error || '登录过程中出现了问题，请尝试以下解决方法'}
          </p>
        </div>

        {/* 显示详细错误信息（调试用） */}
        {(details || timestamp) && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">调试信息</h3>
            {details && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-1">
                <strong>详情:</strong> {details}
              </p>
            )}
            {timestamp && (
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                <strong>时间:</strong> {new Date(timestamp).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">常见解决方法：</h3>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>在 Supabase Auth 设置中，确保 Site URL 为 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">http://localhost:3000</code></span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>在 Redirect URLs 添加 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">http://localhost:3000/auth/callback</code></span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>启用 GitHub Provider，并正确配置 Client ID 与 Client Secret</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">•</span>
                <span>本地环境变量已设置 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> 与 <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={goToSignIn}
              className="flex-1 h-10 rounded-lg bg-[#e5e7eb] dark:bg-slate-700 px-4 text-[#0d141b] dark:text-slate-50 hover:bg-[#dfe3e7] dark:hover:bg-slate-600 transition-colors"
            >
              返回登录页
            </button>
            <button 
              onClick={retryGithub}
              className="flex-1 h-10 rounded-lg bg-primary px-4 text-white hover:bg-primary/90 transition-colors"
            >
              重试 GitHub 登录
            </button>
          </div>

          <button 
            onClick={goHome}
            className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            返回首页
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            如果问题持续存在，请检查浏览器控制台获取详细错误信息
          </p>
        </div>
      </div>
    </div>
  )
}