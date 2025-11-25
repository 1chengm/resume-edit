'use client'

import type { ResumeContent } from '@/types/resume'
import { renderMarkdown } from '@/lib/markdown'

interface ResumeViewProps {
    data: {
        resume?: {
            color_theme?: string
            template?: string
        }
        content?: {
            content_json?: ResumeContent
        }
    }
}

export function ResumeView({ data }: ResumeViewProps) {
    const content = data.content?.content_json || {}
    const theme = data.resume?.color_theme || '#0d0d0d'

    return (
        <div
            className="bg-white shadow-xl rounded-sm w-[210mm] min-h-[297mm] p-[20mm] mx-auto print:shadow-none print:m-0 print:p-[20mm]"
            style={{ borderTop: `4px solid ${theme}`, boxSizing: 'border-box' }}
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
    )
}
