import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function requireApiUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      supabase,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return {
    user,
    supabase,
    response: null as NextResponse<unknown> | null,
  }
}
