'use client'
import { use, useEffect, useState } from 'react'
import type { ResumeContent } from '@/types/resume'
import { renderMarkdown } from '@/lib/markdown'
import { Loader2, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  const content = data.content?.content_json || {}
  const theme = data.resume?.color_theme || '#0d0d0d'

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
        <div
          className="bg-white shadow-xl rounded-sm min-h-[297mm] p-8 md:p-12 print:shadow-none print:p-0"
          style={{ borderTop: `4px solid ${theme}` }}
        >
          <header className="text-center border-b-2 pb-6 mb-8" style={{ borderColor: theme }}>
            <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: theme }}>
              {content.personal?.full_name || 'Your Name'}
            </h1>
            <p className="text-xl text-muted-foreground mb-4">{content.personal?.title || 'Professional Title'}</p>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {content.personal?.phone && <span>{content.personal.phone}</span>}
              {content.personal?.email && <span>{content.personal.email}</span>}
              {content.personal?.linkedin && <span>{content.personal.linkedin}</span>}
              {content.personal?.portfolio && <span>{content.personal.portfolio}</span>}
            </div>
          </header>

          <div className="space-y-8">
            {content.summary && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b pb-1" style={{ color: theme, borderColor: '#eee' }}>Professional Summary</h2>
                <div className="text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(content.summary) }} />
              </section>
            )}

            {(content.experience?.length || 0) > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b pb-1" style={{ color: theme, borderColor: '#eee' }}>Experience</h2>
                <div className="space-y-6">
                  {content.experience?.map((e, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-gray-900">{e?.role}</h3>
                        <span className="text-sm text-gray-500 whitespace-nowrap">{e?.from} – {e?.to}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mb-2">{e?.company}</p>
                      <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                        {(e?.highlights || []).map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(content.projects?.length || 0) > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b pb-1" style={{ color: theme, borderColor: '#eee' }}>Projects</h2>
                <div className="space-y-5">
                  {content.projects?.map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-bold text-gray-900">{p?.name}</h3>
                      </div>
                      <p className="text-sm text-gray-700 mb-2 italic">{p?.description}</p>
                      <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                        {(p?.highlights || []).map((h, idx) => (
                          <li key={idx}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(content.education?.length || 0) > 0 && (
              <section>
                <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b pb-1" style={{ color: theme, borderColor: '#eee' }}>Education</h2>
                <div className="space-y-4">
                  {content.education?.map((e, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-bold text-gray-900">{e?.school}</h3>
                        <span className="text-sm text-gray-500">{e?.year}</span>
                      </div>
                      <p className="text-sm text-gray-700">{e?.degree}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {((content.skills?.length || 0) > 0 || (content.certificates?.length || 0) > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(content.skills?.length || 0) > 0 && (
                  <section>
                    <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b pb-1" style={{ color: theme, borderColor: '#eee' }}>Skills</h2>
                    <div className="flex flex-wrap gap-2">
                      {content.skills?.map((s, i) => (
                        <span key={i} className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{s}</span>
                      ))}
                    </div>
                  </section>
                )}

                {(content.certificates?.length || 0) > 0 && (
                  <section>
                    <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b pb-1" style={{ color: theme, borderColor: '#eee' }}>Certificates</h2>
                    <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                      {content.certificates?.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground pb-8 print:hidden">
          Powered by <span className="font-semibold text-primary">ResumeCraft</span>
        </div>
      </div>
    </main>
  )
}