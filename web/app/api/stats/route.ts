import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  // 首先进行认证检查
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const type = body.type
  const resume_id = body.resume_id
  if (!type || !resume_id) return NextResponse.json({ error: 'Missing type or resume_id' }, { status: 400 })

  // 使用简单客户端
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('authorization') || '' } }
  })

  const { data } = await supabase.from('resume_stats').select('id,count').eq('resume_id', resume_id).eq('type', type).single()
  if (!data) {
    const { error } = await supabase.from('resume_stats').insert({ resume_id, type, count: 1 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('resume_stats').update({ count: (data.count || 0) + 1 }).eq('id', data.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}