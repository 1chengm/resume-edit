import { supabase } from '@/src/lib/supabase/client'

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  try {
    // 获取当前用户 session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No authenticated session')
    }

    // 添加 Authorization header
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${session.access_token}`)

    // 如果 body 是 FormData，不要设置 Content-Type，让浏览器自动设置
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    return fetch(url, {
      ...options,
      headers
    })
  } catch (error) {
    console.error('Authentication error:', error)
    throw error
  }
}