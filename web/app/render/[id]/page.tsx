import { createSupabaseAdminClient } from '@/src/lib/supabase/admin'
import { ResumeView } from '@/components/resume-view'
import { notFound } from 'next/navigation'

export default async function RenderPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ secret: string }>
}) {
    const { id } = await params
    const { secret } = await searchParams

    if (secret !== process.env.RENDER_SECRET && secret !== 'internal-render-secret') {
        return notFound()
    }

    const supabase = createSupabaseAdminClient()

    // Fetch resume data
    const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('color_theme, template')
        .eq('id', id)
        .single()

    if (resumeError || !resume) {
        return notFound()
    }

    // Fetch content data
    const { data: content, error: contentError } = await supabase
        .from('resume_content')
        .select('content_json')
        .eq('resume_id', id)
        .single()

    if (contentError) {
        return notFound()
    }

    const data = {
        resume,
        content
    }

    return (
        <div className="min-h-screen bg-white p-0">
            <ResumeView data={data} />
        </div>
    )
}
