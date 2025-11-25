import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 使用统一的服务端客户端
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const type = body.type
  const resume_id = body.resume_id
  if (!type || !resume_id) return NextResponse.json({ error: 'Missing type or resume_id' }, { status: 400 })

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