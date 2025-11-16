import { NextResponse, NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createAuthenticatedClient } from '@/lib/api-client'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAuthenticatedClient(req)
  const { id } = await params

  // 同时获取简历内容和元数据
  const { data: resumeData, error: resumeError } = await supabase
    .from('resumes')
    .select('id, title, template, color_theme, updated_at')
    .eq('id', id)
    .single()

  if (resumeError) {
    console.error('Resume query error:', resumeError)
    return NextResponse.json({ error: resumeError.message }, { status: 500 })
  }

  const { data: contentData, error: contentError } = await supabase
    .from('resume_content')
    .select('content_json')
    .eq('resume_id', id)
    .single()

  if (contentError) {
    console.error('Content query error:', contentError)
    return NextResponse.json({ error: contentError.message }, { status: 500 })
  }

  // 合并数据
  const combinedData = {
    ...resumeData,
    content_json: contentData.content_json || {}
  }

  return NextResponse.json(combinedData)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAuthenticatedClient(req)
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (body.content_json) {
    const current = await supabase.from('resume_content').select('content_json').eq('resume_id', id).single()
    if (!current.error && current.data?.content_json) {
      await supabase.from('resume_content_versions').insert({ resume_id: id, content_json: current.data.content_json })
      const { data: versions } = await supabase.from('resume_content_versions').select('id,created_at').eq('resume_id', id).order('created_at', { ascending: false })
      const toDelete = (versions || []).slice(5).map(v => v.id)
      if (toDelete.length) await supabase.from('resume_content_versions').delete().in('id', toDelete)
    }
    const { error } = await supabase.from('resume_content').update({ content_json: body.content_json }).eq('resume_id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (body.title || body.template || body.color_theme) {
    const { error } = await supabase.from('resumes').update({ title: body.title, template: body.template, color_theme: body.color_theme }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAuthenticatedClient(req)
  const { id } = await params
  await supabase.from('resume_content').delete().eq('resume_id', id)
  const { error } = await supabase.from('resumes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}