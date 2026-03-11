import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ResumeView } from '@/components/resume-view'

async function RenderContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ secret: string }>
}) {
  const { id } = await params
  const { secret } = await searchParams

  const renderSecret = process.env.RENDER_SECRET
  if (!renderSecret || secret !== renderSecret) {
    return notFound()
  }

  const supabase = createSupabaseAdminClient()

  const [{ data: resume, error: resumeError }, { data: content, error: contentError }] = await Promise.all([
    supabase
      .from('resumes')
      .select('color_theme, template')
      .eq('id', id)
      .single(),
    supabase
      .from('resume_content')
      .select('content_json')
      .eq('resume_id', id)
      .single(),
  ])

  if (resumeError || !resume || contentError) {
    return notFound()
  }

  return (
    <div className="min-h-screen bg-white p-0">
      <ResumeView data={{ resume, content }} />
    </div>
  )
}

export default function RenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ secret: string }>
}) {
  return (
    <Suspense fallback={<div className="atelier-loading">Loading...</div>}>
      <RenderContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}
