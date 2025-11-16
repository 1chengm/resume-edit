// 向后兼容的 supabaseClient 导出
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export function getSupabaseClient() {
  return createBrowserClient()
}

export const supabase = createBrowserClient()