'use client'
import { useRef, useState, useEffect } from 'react'
import { authenticatedFetch } from '@/src/lib/authenticatedFetch'
import { getSupabaseClient } from '@/src/lib/supabaseClient'

export default function ExportSharePage() {
  const ref = useRef<HTMLDivElement>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [permission, setPermission] = useState<'public'|'private'|'password'>('public')
  const [password, setPassword] = useState('')
  const [uploading, setUploading] = useState(false)
  const [resumeContent, setResumeContent] = useState<any>(null)
  const [resumeMetadata, setResumeMetadata] = useState<any>(null)

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
          console.error('Failed to fetch resume:', res.status, res.statusText)
          return
        }

        const data = await res.json()
        console.log('Loaded resume data:', data)

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
    window.open(`/api/export-pdf/${id}`, '_blank');
    
    try {
      // We still record the stat, even though generation is server-side
      await authenticatedFetch('/api/stats', {
        method: 'POST',
        body: JSON.stringify({ type: 'pdf_download', resume_id: id })
      })
    } catch (error) {
      console.error('Failed to record PDF download stat:', error)
    }
  }

  async function createShare() {
    try {
      const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
      if (!id) {
        console.error('No resume ID found for sharing')
        alert('无法创建分享链接：缺少简历 ID')
        return
      }

      console.log('Creating share link for resume:', id)

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
        console.error('Share API error:', res.status, res.statusText, errorData)
        alert(`创建分享链接失败：${errorData.error || res.statusText}`)
        return
      }

      const data = await res.json()
      console.log('Share response:', data)

      if (data.share_uuid) {
        const shareUrl = `${location.origin}/s/${data.share_uuid}`
        console.log('Setting share URL:', shareUrl)
        setShareUrl(shareUrl)
      } else {
        console.error('No share_uuid in response:', data)
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

      setUploading(true)

      // 生成简单的 PDF Blob
      const blob = await generateResumePDFBlobFromData(resumeContent, resumeMetadata)

      // 上传到 Supabase
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      const path = `${(user?.id || 'anonymous')}/${id}.pdf`

      await supabase.storage.from('resumes').upload(path, blob, {
        contentType: 'application/pdf',
        upsert: true
      })
      alert('PDF 上传成功！')
    } catch (error) {
      console.error('PDF upload failed:', error)
      alert('PDF 上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid grid-cols-3">
      <div className="col-span-2 p-8 space-y-4">
        <h1 className="text-2xl font-bold">导出为 PDF</h1>
        <p className="text-gray-500">生成打印友好的 PDF 文件</p>
        <div className="flex gap-3">
          <button className="h-10 px-4 rounded-lg bg-primary text-white font-bold" onClick={generatePDF}>生成 PDF</button>
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
                  {resumeContent.education.map((edu: any, idx: number) => (
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
                  {resumeContent.experience.map((exp: any, idx: number) => (
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
                  {resumeContent.projects.map((project: any, idx: number) => (
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
          <label className="flex items-center gap-2">
            <input type="radio" checked={permission==='public'} onChange={() => setPermission('public')} /> 公开
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={permission==='private'} onChange={() => setPermission('private')} /> 私密
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={permission==='password'} onChange={() => setPermission('password')} /> 密码
          </label>
          {permission==='password' && (
            <input className="w-full h-10 border rounded-lg px-3" placeholder="设置分享密码" value={password} onChange={e => setPassword(e.target.value)} />
          )}
        </div>
        <button className="h-10 px-4 rounded-lg bg-primary text-white font-bold" onClick={createShare}>生成分享链接</button>
        {shareUrl && (
          <div className="mt-2">
            <input className="w-full h-10 border rounded-lg px-3" readOnly value={shareUrl} />
            <div className="mt-2 flex gap-2">
              <button className="h-10 px-4 rounded-lg bg-gray-100 font-bold" onClick={() => navigator.clipboard.writeText(shareUrl)}>复制链接</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}