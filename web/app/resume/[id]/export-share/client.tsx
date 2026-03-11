'use client'
import { useRef, useState, useEffect } from 'react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { Copy, ExternalLink, X } from 'lucide-react'

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
  const ref = useRef<HTMLDivElement>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [permission, setPermission] = useState<'public' | 'private' | 'password'>('public')
  const [password, setPassword] = useState('')
  const [uploading, setUploading] = useState(false)
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
      alert('无法生成 PDF：缺少简历 ID')
      return
    }

    try {
      window.print()

      // Record stat
      await authenticatedFetch('/api/stats', {
        method: 'POST',
        body: JSON.stringify({ type: 'pdf_download', resume_id: id })
      })
    } catch (error) {
      console.error('Failed to generate PDF:', error)
      alert('生成 PDF 失败，请重试')
    }
  }

  async function createShare() {
    try {
      const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
      if (!id) {
        alert('无法创建分享链接：缺少简历 ID')
        return
      }

      const res = await authenticatedFetch('/api/share', {
        method: 'POST',
        body: JSON.stringify({
          permission,
          resume_id: id,
          password: permission === 'password' ? password : undefined
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Share API error:', errorData)
        alert(`创建分享链接失败：${errorData.error || res.statusText}`)
        return
      }

      const data = await res.json()

      if (data.share_uuid) {
        const shareUrl = `${location.origin}/s/${data.share_uuid}`
        setShareUrl(shareUrl)
      } else {
        alert('创建分享链接失败：服务器返回无效响应')
      }
    } catch (error) {
      console.error('Share creation failed:', error)
      alert('创建分享链接失败，请重试')
    }
  }

  async function uploadPDF() {
    try {
      const { generateResumePDFBlobFromData } = await import('@/lib/simple-pdf-generator')

      // 获取简历 ID
      const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
      if (!id) {
        alert('缺少简历 ID，无法上传 PDF')
        return
      }

      setUploading(true)

      // 生成简单的 PDF Blob
      const blob = await generateResumePDFBlobFromData(resumeContent, resumeMetadata)

      const formData = new FormData()
      formData.append('file', blob, `${id}.pdf`)

      const response = await authenticatedFetch(`/api/resumes/${id}/pdf`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '上传失败' }))
        alert(errorData.error || 'PDF 上传失败，请重试')
        return
      }

      alert('PDF 上传成功！')
    } catch (error) {
      console.error('PDF upload failed:', error)
      alert('PDF 上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid grid-cols-3 relative">
      <div className="col-span-2 p-8 space-y-4">
        <h1 className="text-2xl font-bold">导出为 PDF</h1>
        <p className="text-gray-500">生成打印友好的 PDF 文件</p>
        <div className="flex gap-3">
          <button
            className="h-10 px-4 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
            onClick={generatePDF}
          >
            生成 PDF
          </button>
          <button className="h-10 px-4 rounded-lg bg-gray-800 text-white font-bold disabled:opacity-60" onClick={uploadPDF} disabled={uploading}>{uploading ? '上传中...' : '上传到云端'}</button>
        </div>
        <div ref={ref} className="mt-6">
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
      <div className="border-l p-8 space-y-4">
        <h1 className="text-2xl font-bold">分享链接</h1>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={permission === 'public'} onChange={() => setPermission('public')} className="accent-primary" />
            <span>公开</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={permission === 'private'} onChange={() => setPermission('private')} className="accent-primary" />
            <span>私密</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={permission === 'password'} onChange={() => setPermission('password')} className="accent-primary" />
            <span>密码保护</span>
          </label>
          {permission === 'password' && (
            <input className="w-full h-10 border rounded-lg px-3 focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="设置分享密码" value={password} onChange={e => setPassword(e.target.value)} />
          )}
        </div>

        {!shareUrl ? (
          <button className="w-full h-10 px-4 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors" onClick={createShare}>生成分享链接</button>
        ) : (
          <div className="mt-4 p-4 bg-muted/30 rounded-xl border space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                链接已生成
              </span>
              <button onClick={() => setShareUrl('')} className="text-xs text-muted-foreground hover:text-destructive transition-colors">关闭</button>
            </div>
            <input className="w-full h-10 border rounded-lg px-3 bg-white text-sm" readOnly value={shareUrl} onClick={e => e.currentTarget.select()} />
            <div className="flex gap-2">
              <button
                className="flex-1 h-9 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  alert('链接已复制到剪贴板')
                }}
              >
                <Copy className="h-4 w-4" />
                复制
              </button>
              <button
                className="flex-1 h-9 rounded-lg border bg-white font-medium text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                onClick={() => window.open(shareUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                打开
              </button>
              <button
                className="h-9 px-3 rounded-lg border bg-white font-medium text-sm hover:bg-gray-50 transition-colors text-muted-foreground"
                onClick={() => setShareUrl('')}
                title="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
