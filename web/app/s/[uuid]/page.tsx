'use client'
import { use, useEffect, useState } from 'react'
import type { ResumeContent } from '@/types/resume'
import { Loader2, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResumeView } from '@/components/resume-view'

export default function ShareReadOnlyPage({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = use(params)
  const [data, setData] = useState<{ resume?: { color_theme?: string; template?: string }; content?: { content_json?: ResumeContent } } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ; (async () => {
      try {
        const res = await fetch(`/api/share/${resolvedParams.uuid}`)
        const j = await res.json()
        if (!res.ok) setError(j.error || 'Failed to load resume')
        else setData(j)
      } catch (err) {
        setError('Failed to load resume')
      }
    })()
  }, [resolvedParams.uuid])

  if (error) return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Error Loading Resume</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <main className="min-h-screen bg-muted/10 py-8 px-4 print:p-0 print:bg-white">
      <div className="max-w-[210mm] mx-auto space-y-6">
        {/* Actions Bar (Hidden in Print) */}
        <div className="flex justify-end gap-2 print:hidden">
          <Button onClick={() => window.print()} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Print / PDF
          </Button>
        </div>

        {/* Resume Paper */}
        <ResumeView data={data} />

        <div className="text-center text-sm text-muted-foreground pb-8 print:hidden">
          Powered by <span className="font-semibold text-primary">ResumeCraft</span>
        </div>
      </div>
    </main>
  )
}