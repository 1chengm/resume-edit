import { NextResponse, NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { updateTag } from 'next/cache'
import { requireApiUser } from '@/lib/auth/require-user'

async function ensureResumeOwnership(supabase: SupabaseClient, resumeId: string, userId: string) {
  const { data: resume, error } = await supabase
    .from('resumes')
    .select('id')
    .eq('id', resumeId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { ok: false as const, error }
  }

  if (!resume) {
    return { ok: false as const, notFound: true as const }
  }

  return { ok: true as const }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // 仅允许访问当前用户拥有的简历
  const { data: resumeData, error: resumeError } = await supabase
    .from('resumes')
    .select('id, title, template, color_theme, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (resumeError) {
    console.error('Resume query error:', resumeError)
    return NextResponse.json({ error: resumeError.message }, { status: 500 })
  }
  if (!resumeData) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const { data: contentData, error: contentError } = await supabase
    .from('resume_content')
    .select('content_json')
    .eq('resume_id', id)
    .maybeSingle()

  if (contentError) {
    console.error('Content query error:', contentError)
    return NextResponse.json({ error: contentError.message }, { status: 500 })
  }

  // 合并数据
  const combinedData = {
    ...resumeData,
    content_json: contentData?.content_json || {}
  }

  return NextResponse.json(combinedData)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ownership = await ensureResumeOwnership(supabase, id, user.id)
  if (!ownership.ok) {
    if ('notFound' in ownership) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }
    return NextResponse.json({ error: ownership.error.message }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const hasContent = typeof body.content_json !== 'undefined'
  const hasMeta = typeof body.title !== 'undefined' || typeof body.template !== 'undefined' || typeof body.color_theme !== 'undefined'
  if (!hasContent && !hasMeta) {
    return NextResponse.json({ error: 'No update fields provided' }, { status: 400 })
  }

  const { data: resumeMeta } = await supabase
    .from('resumes')
    .select('share_uuid')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (hasContent) {
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

  if (hasMeta) {
    const updatePayload: Record<string, unknown> = {}
    if (typeof body.title !== 'undefined') updatePayload.title = body.title
    if (typeof body.template !== 'undefined') updatePayload.template = body.template
    if (typeof body.color_theme !== 'undefined') updatePayload.color_theme = body.color_theme

    const { error } = await supabase
      .from('resumes')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (resumeMeta?.share_uuid) {
    updateTag(`share:${resumeMeta.share_uuid}`)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const ownership = await ensureResumeOwnership(supabase, id, user.id)
  if (!ownership.ok) {
    if ('notFound' in ownership) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }
    return NextResponse.json({ error: ownership.error.message }, { status: 500 })
  }

  const { data: resumeMeta } = await supabase
    .from('resumes')
    .select('share_uuid')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  await supabase.from('resume_content').delete().eq('resume_id', id)
  const { error } = await supabase
    .from('resumes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (resumeMeta?.share_uuid) {
    updateTag(`share:${resumeMeta.share_uuid}`)
  }

  return NextResponse.json({ ok: true })
}
