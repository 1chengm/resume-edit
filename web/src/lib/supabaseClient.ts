// 请注意: 此文件正在逐步淘汰
// 请直接使用: import { createClient } from '@/lib/supabase/client'
// 或: import { supabase } from '@/lib/supabase/client'

// 向后兼容的 supabaseClient 导出
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export function getSupabaseClient() {
  console.warn('getSupabaseClient() is deprecated. Use createClient() from @/lib/supabase/client instead.')
  return createBrowserClient()
}

export const supabase = createBrowserClient()