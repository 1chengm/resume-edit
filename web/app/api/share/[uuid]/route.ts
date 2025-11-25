import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdminClient } from '@/src/lib/supabase/admin'
import { createHash } from 'crypto'

export async function GET(req: NextRequest, { params }: { params: Promise<{ uuid: string }> }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { uuid } = await params
  const { data: resume, error } = await supabase.from('resumes').select('*').eq('share_uuid', uuid).single()
  if (error || !resume) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // 权限简单处理（MVP）：公开直接返回；私密需登录；密码暂不校验
  if (resume.share_permission === 'private') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.id !== resume.user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (resume.share_permission === 'password') {
    const url = new URL(req.url)
    const password = url.searchParams.get('password') || req.headers.get('x-password') || ''
    const hash = createHash('sha256').update(password).digest('hex')
    if (!password || hash !== resume.share_password_hash) return NextResponse.json({ error: 'Password required' }, { status: 403 })
  }
  const { data: content } = await supabase.from('resume_content').select('*').eq('resume_id', resume.id).single()
  const admin = createSupabaseAdminClient()
  const { data: stat } = await admin.from('resume_stats').select('id,count').eq('resume_id', resume.id).eq('type', 'share_view').single()
  if (!stat) {
    await admin.from('resume_stats').insert({ resume_id: resume.id, type: 'share_view', count: 1 })
  } else {
    await admin.from('resume_stats').update({ count: (stat.count || 0) + 1 }).eq('id', stat.id)
  }
  return NextResponse.json({ resume, content })
}