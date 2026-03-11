import { NextResponse, NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/auth/require-user'

export async function POST(req: NextRequest) {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const type = body.type
  const resume_id = body.resume_id
  if (!type || !resume_id) return NextResponse.json({ error: 'Missing type or resume_id' }, { status: 400 })

  const { data: resume, error: resumeError } = await supabase
    .from('resumes')
    .select('id')
    .eq('id', resume_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (resumeError) {
    return NextResponse.json({ error: resumeError.message }, { status: 500 })
  }
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const { data } = await supabase
    .from('resume_stats')
    .select('id,count')
    .eq('resume_id', resume_id)
    .eq('type', type)
    .single()
  if (!data) {
    const { error } = await supabase.from('resume_stats').insert({ resume_id, type, count: 1 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('resume_stats').update({ count: (data.count || 0) + 1 }).eq('id', data.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
