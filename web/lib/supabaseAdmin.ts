import { createSupabaseAdminClient as createSupabaseAdminClientImpl } from '@/lib/supabase/admin'

export function createSupabaseAdminClient() {
  return createSupabaseAdminClientImpl()
}
