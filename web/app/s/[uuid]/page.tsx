import { createHash } from 'crypto'
import { after } from 'next/server'
import { cacheLife, cacheTag } from 'next/cache'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ResumeView } from '@/components/resume-view'
import { SharePageActions } from '@/components/share-page-actions'
import type { ResumeContent } from '@/types/resume'

type ShareResponseData = {
  resume: {
    id: string
    color_theme?: string | null
    template?: string | null
  }
  content: {
    content_json?: ResumeContent
  } | null
}

async function trackShareView(resumeId: string) {
  const admin = createSupabaseAdminClient()

  const { data: stat } = await admin
    .from('resume_stats')
    .select('id,count')
    .eq('resume_id', resumeId)
    .eq('type', 'share_view')
    .single()

  if (!stat) {
    await admin
      .from('resume_stats')
      .insert({ resume_id: resumeId, type: 'share_view', count: 1 })
    return
  }

  await admin
    .from('resume_stats')
    .update({ count: (stat.count || 0) + 1 })
    .eq('id', stat.id)
}

async function getCachedPublicShareData(uuid: string): Promise<ShareResponseData | null> {
  'use cache'
  cacheLife('minutes')
  cacheTag(`share:${uuid}`)

  const admin = createSupabaseAdminClient()
  const { data: resume, error: resumeError } = await admin
    .from('resumes')
    .select('id,color_theme,template')
    .eq('share_uuid', uuid)
    .eq('share_permission', 'public')
    .maybeSingle()

  if (resumeError || !resume) return null

  const { data: content, error: contentError } = await admin
    .from('resume_content')
    .select('content_json')
    .eq('resume_id', resume.id)
    .maybeSingle()

  if (contentError) return null

  return {
    resume,
    content,
  }
}

async function getDynamicShareData(uuid: string, password: string): Promise<{ data?: ShareResponseData; error?: string }> {
  const admin = createSupabaseAdminClient()
  const { data: resume, error: resumeError } = await admin
    .from('resumes')
    .select('id,user_id,share_permission,share_password_hash,color_theme,template')
    .eq('share_uuid', uuid)
    .maybeSingle()

  if (resumeError || !resume) {
    return { error: 'Not found' }
  }

  if (resume.share_permission === 'private') {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || user.id !== resume.user_id) {
      return { error: 'Unauthorized' }
    }
  }

  if (resume.share_permission === 'password') {
    const hash = createHash('sha256').update(password).digest('hex')
    if (!password || hash !== resume.share_password_hash) {
      return { error: 'Password required' }
    }
  }

  const { data: content, error: contentError } = await admin
    .from('resume_content')
    .select('content_json')
    .eq('resume_id', resume.id)
    .maybeSingle()

  if (contentError) {
    return { error: 'Not found' }
  }

  return {
    data: {
      resume: {
        id: resume.id,
        color_theme: resume.color_theme,
        template: resume.template,
      },
      content,
    },
  }
}

async function ShareReadOnlyContent({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>
  searchParams: Promise<{ password?: string | string[] }>
}) {
  const { uuid } = await params
  const resolvedSearchParams = await searchParams
  const password = Array.isArray(resolvedSearchParams.password)
    ? resolvedSearchParams.password[0] ?? ''
    : resolvedSearchParams.password ?? ''

  let data = await getCachedPublicShareData(uuid)
  let error = ''

  if (!data) {
    const dynamicResult = await getDynamicShareData(uuid, password)
    data = dynamicResult.data ?? null
    error = dynamicResult.error || ''
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error Loading Resume</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  after(async () => {
    try {
      await trackShareView(data.resume.id)
    } catch (trackError) {
      console.error('Track share view failed:', trackError)
    }
  })

  return (
    <main className="min-h-screen bg-muted/10 py-8 px-4 print:p-0 print:bg-white">
      <div className="max-w-[210mm] mx-auto space-y-6">
        <SharePageActions />

        <ResumeView data={data} />

        <div className="text-center text-sm text-muted-foreground pb-8 print:hidden">
          Powered by <span className="font-semibold text-primary">ResumeCraft</span>
        </div>
      </div>
    </main>
  )
}

export default function ShareReadOnlyPage({
  params,
  searchParams,
}: {
  params: Promise<{ uuid: string }>
  searchParams: Promise<{ password?: string | string[] }>
}) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <ShareReadOnlyContent params={params} searchParams={searchParams} />
    </Suspense>
  )
}
