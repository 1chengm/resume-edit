import { NextResponse, NextRequest } from 'next/server'
import { authenticateRequest } from '@/src/lib/api-auth'
import { createAuthenticatedClient } from '@/src/lib/api-client'

function isDisplayNameValid(name: string) {
  if (typeof name !== 'string') return false
  const v = name.trim()
  if (v.length < 2 || v.length > 32) return false
  return /^[\p{L}0-9 _.-]+$/u.test(v)
}

export async function GET(req: NextRequest) {
  // 设置适当的响应头
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  })

  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, {
      status: 401,
      headers
    })
  }

  try {
    const supabase = createAuthenticatedClient(req)
    const { data, error } = await supabase.from('profiles').select('display_name,avatar_url').eq('user_id', user.id).single()

    // 如果 profile 不存在，创建一个默认的
    if (error && error.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id })
        .select('display_name,avatar_url')
        .single()

      if (insertError) {
        console.error('Profile creation error:', insertError)
        return NextResponse.json({ error: insertError.message }, {
          status: 500,
          headers
        })
      }

      return NextResponse.json(newProfile || { display_name: null, avatar_url: null }, {
        headers
      })
    }

    if (error) {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: error.message }, {
        status: 500,
        headers
      })
    }

    return NextResponse.json(data || { display_name: null, avatar_url: null }, {
      headers
    })
  } catch (err) {
    console.error('Unexpected error in GET /api/profile:', err)
    return NextResponse.json({ error: 'Internal server error' }, {
      status: 500,
      headers
    })
  }
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
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ display_name })
    .eq('user_id', user.id)

  if (updateError) {
    console.error('Profile update error:', updateError)
    // 如果记录不存在，尝试插入
    if (updateError.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user.id, display_name })
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}