// 向后兼容的 supabaseClient 导出
import { createClient } from '@/src/lib/supabase/client'

export function getSupabaseClient() {
  return createClient()
}

export const supabase = createClient()