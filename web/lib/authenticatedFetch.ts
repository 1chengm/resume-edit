import { supabase } from '@/src/lib/supabase/client'

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  try {
    // 获取当前用户 session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No authenticated session')
    }

    // 添加 Authorization header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: `Bearer ${session.access_token}`
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