'use client'
import { use, useEffect, useState } from 'react'
import type { ResumeContent } from '@/types/resume'

export default function ShareReadOnlyPage({ params }: { params: Promise<{ uuid: string }> }) {
  const resolvedParams = use(params)
  const [data, setData] = useState<{ resume?: { color_theme?: string; template?: string }; content?: { content_json?: ResumeContent } } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      const res = await fetch(`/api/share/${resolvedParams.uuid}`)
      const j = await res.json()
      if (!res.ok) setError(j.error || '加载失败')
      else setData(j)
    })()
  }, [resolvedParams.uuid])

  if (error) return <div className="p-8"><p className="text-[#d92d20]">{error}</p></div>
  if (!data) return <div className="p-8">加载中...</div>

  const content = data.content?.content_json || {}
  const theme = '#0d0d0d'

  return (
    <main className="flex justify-center p-8" style={{ backgroundColor: '#f5f5f5' }}>
      <div className="rounded-lg shadow w-full max-w-[210mm] min-h-[297mm] p-10" style={{ backgroundColor: '#ffffff', borderTopColor: theme }}>
        <header className="text-center border-b-2 pb-4 mb-6" style={{ borderColor: theme }}>
          <h1 className="text-4xl font-bold text-[#0d0d0d]">{content.personal?.full_name || '姓名'}</h1>
          <p className="text-lg mt-1 text-[#333333]">{content.personal?.title || '职称'}</p>
          <div className="flex justify-center gap-4 text-sm mt-2" style={{ color: '#555555' }}>
            {content.personal?.phone && <span>{content.personal.phone}</span>}
            {content.personal?.email && <span>|</span>}
            {content.personal?.email && <span>{content.personal.email}</span>}
            {(content.personal?.linkedin || content.personal?.portfolio) && <span>|</span>}
            {content.personal?.linkedin && <span>{content.personal.linkedin}</span>}
            {content.personal?.portfolio && <span>{content.personal.portfolio}</span>}
          </div>
        </header>
        <section>
          <h2 className="text-lg font-bold text-[#111111]">职业概述</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-[#444444]">{content.summary || '暂无'}</p>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#111111]">教育经历</h2>
          <div className="space-y-3">
            {(content.education || []).map((e, i) => (
              <div key={i}>
                <div className="flex justify-between text-[#111111]"><span className="font-bold">{e?.degree}</span><span className="text-sm" style={{ color: '#555555' }}>{e?.year}</span></div>
                <p className="text-sm italic text-[#444444]">{e?.school}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#111111]">工作经历</h2>
          <div className="space-y-4">
            {(content.experience || []).map((e, i) => (
              <div key={i}>
                <div className="flex justify-between text-[#111111]"><span className="font-bold">{e?.role}</span><span className="text-sm" style={{ color: '#555555' }}>{e?.from} - {e?.to}</span></div>
                <p className="text-sm italic text-[#444444]">{e?.company}</p>
                <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-[#444444]">
                  {(e?.highlights || []).map((h, idx) => (<li key={idx}>{h}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#111111]">项目经验</h2>
          <div className="space-y-4">
            {(content.projects || []).map((p, i) => (
              <div key={i}>
                <div className="flex justify-between text-[#111111]"><span className="font-bold">{p?.name}</span></div>
                <p className="text-sm italic text-[#444444]">{p?.description}</p>
                <ul className="list-disc pl-5 mt-2 text-sm space-y-1 text-[#444444]">
                  {(p?.highlights || []).map((h, idx) => (<li key={idx}>{h}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#111111]">技能</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {(content.skills || []).map((s, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: '#f0f0f0', color: '#1a1a1a', border: '1px solid #d0d0d0' }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#111111]">证书</h2>
          <div className="flex flex-wrap gap-2 mt-2">
            {(content.certificates || []).map((s, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ backgroundColor: '#f7f7f7', color: '#1a1a1a', border: '1px solid #d9d9d9' }}
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}