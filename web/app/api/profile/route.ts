import { NextResponse, NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createAuthenticatedClient } from '@/lib/api-client'

function isDisplayNameValid(name: string) {
  if (typeof name !== 'string') return false
  const v = name.trim()
  if (v.length < 2 || v.length > 32) return false
  return /^[\p{L}0-9 _.-]+$/u.test(v)
}

export async function GET(req: NextRequest) {
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAuthenticatedClient(req)
  const { data, error } = await supabase.from('profiles').select('display_name,avatar_url').eq('user_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || {})
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAuthenticatedClient(req)
  const body = await req.json().catch(() => ({}))
  const display_name = (body.display_name || '').trim()
  if (!isDisplayNameValid(display_name)) return NextResponse.json({ error: 'Invalid display name' }, { status: 400 })
  const { error } = await supabase.from('profiles').upsert({ user_id: user.id, display_name }).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}