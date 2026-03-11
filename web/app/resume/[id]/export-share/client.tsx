'use client'
import { useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

type ResumeMetadata = {
  title: string
  template: string
  color_theme: string
}

type ResumeContent = {
  personal?: {
    full_name?: string
    title?: string
    phone?: string
    email?: string
    linkedin?: string
    portfolio?: string
  }
  summary?: string
  education?: Array<{ school?: string; degree?: string; year?: string }>
  experience?: Array<{ company?: string; role?: string; from?: string; to?: string; highlights?: string[] }>
  projects?: Array<{ name?: string; description?: string; highlights?: string[] }>
  skills?: string[]
  certificates?: string[]
}

export default function ExportSharePage() {
  const [resumeContent, setResumeContent] = useState<ResumeContent | null>(null)
  const [resumeMetadata, setResumeMetadata] = useState<ResumeMetadata | null>(null)

  // 加载简历数据
  useEffect(() => {
    const loadResumeData = async () => {
      const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
      if (!id) {
        console.error('No resume ID found in URL')
        return
      }

      try {
        const res = await authenticatedFetch(`/api/resumes/${id}`)
        if (!res.ok) {
          console.error('Failed to fetch resume')
          return
        }

        const data = await res.json()

        // 确保数据结构正确
        const content = data.content_json || {}
        const metadata = {
          title: data.title || '未命名简历',
          template: data.template || 'Modern',
          color_theme: data.color_theme || '#2b8cee'
        }

        setResumeContent(content)
        setResumeMetadata(metadata)
      } catch (error) {
        console.error('Failed to load resume data:', error)
      }
    }

    loadResumeData()
  }, [])

  async function generatePDF() {
    const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
    if (!id) {
      alert('Missing Resume ID')
      return
    }
    window.print()

    try {
      await authenticatedFetch('/api/stats', {
        method: 'POST',
        body: JSON.stringify({ type: 'pdf_download', resume_id: id })
      })
    } catch (error) {
      console.error('Failed to record PDF download stat:', error)
    }
  }

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={generatePDF} className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">预览简历导出</span>
        </Button>
      </div>
      <div className="mt-6">
        <div className="mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white rounded-lg shadow p-10" style={{ borderTopColor: resumeMetadata?.color_theme || '#2b8cee' }}>
          <header className="text-center border-b-2 pb-4 mb-6" style={{ borderColor: resumeMetadata?.color_theme || '#2b8cee' }}>
            <h1 className="text-4xl font-bold mb-2" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>
              {resumeContent?.personal?.full_name || '姓名'}
            </h1>
            <p className="text-lg mb-2" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>
              {resumeContent?.personal?.title || '职称'}
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-gray-600 flex-wrap">
              {resumeContent?.personal?.phone && <span>{resumeContent.personal.phone}</span>}
              {resumeContent?.personal?.email && <span>{resumeContent.personal.email}</span>}
              {resumeContent?.personal?.linkedin && <span>{resumeContent.personal.linkedin}</span>}
              {resumeContent?.personal?.portfolio && <span>{resumeContent.personal.portfolio}</span>}
            </div>
          </header>

          {resumeContent?.summary && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>职业概述</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line">{resumeContent.summary}</p>
            </section>
          )}

          {resumeContent?.education && resumeContent.education.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>教育经历</h2>
              <div className="space-y-3">
                {resumeContent.education.map((edu, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <span className="font-semibold">{edu.degree}</span>
                      <span className="text-sm text-gray-600">{edu.year}</span>
                    </div>
                    <p className="text-sm text-gray-700 italic">{edu.school}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeContent?.experience && resumeContent.experience.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>工作经历</h2>
              <div className="space-y-4">
                {resumeContent.experience.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <span className="font-semibold">{exp.role}</span>
                      <span className="text-sm text-gray-600">{exp.from} - {exp.to}</span>
                    </div>
                    <p className="text-sm text-gray-700 italic mb-2">{exp.company}</p>
                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {exp.highlights.map((highlight: string, hIdx: number) => (
                          <li key={hIdx}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeContent?.projects && resumeContent.projects.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>项目经验</h2>
              <div className="space-y-4">
                {resumeContent.projects.map((project, idx) => (
                  <div key={idx}>
                    <div className="font-semibold mb-1">{project.name}</div>
                    <p className="text-sm text-gray-700 italic mb-2">{project.description}</p>
                    {project.highlights && project.highlights.length > 0 && (
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {project.highlights.map((highlight: string, hIdx: number) => (
                          <li key={hIdx}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {resumeContent?.skills && resumeContent.skills.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>技能</h2>
              <div className="flex flex-wrap gap-2">
                {resumeContent.skills.map((skill: string, idx: number) => (
                  <span key={idx} className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {resumeContent?.certificates && resumeContent.certificates.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-bold mb-3" style={{ color: resumeMetadata?.color_theme || '#2b8cee' }}>证书</h2>
              <div className="flex flex-wrap gap-2">
                {resumeContent.certificates.map((cert: string, idx: number) => (
                  <span key={idx} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
                    {cert}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
