import { supabase } from '@/lib/supabase/client'

export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.access_token) {
      throw new Error('No authenticated session')
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${session.access_token}`)

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    return fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    console.error('Authentication error:', error)
    throw error
  }
}
