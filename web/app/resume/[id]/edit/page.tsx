'use client'
import { useState, useRef, useEffect } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { authenticatedFetch } from '@/src/lib/authenticatedFetch'

export default function ResumeEditPage() {
  const [form, setForm] = useState({
    fullName: '',
    title: '',
    phone: '',
    email: '',
    linkedin: '',
    portfolio: '',
    summary: ''
  })
  const [template, setTemplate] = useState('Modern')
  const [color, setColor] = useState('#0d0d0d')
  const [education, setEducation] = useState<Array<{ school: string; degree: string; year: string }>>([])
  const [experience, setExperience] = useState<Array<{ company: string; role: string; from: string; to: string; highlights: string }>>([])
  const [projects, setProjects] = useState<Array<{ name: string; description: string; highlights: string }>>([])
  const [skills, setSkills] = useState<string[]>([])
  const [certs, setCerts] = useState<string[]>([])
  const [scale, setScale] = useState(1)
  const lastSaveRef = useRef<number>(0)
  const [shareUrl, setShareUrl] = useState('')
  const [savedText, setSavedText] = useState('未保存')
  const previewRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLTextAreaElement>(null)
  const [dirty, setDirty] = useState(false)

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm(prev => ({ ...prev, [k]: v }))
    setDirty(true)
  }

  useEffect(() => {
    const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
    if (!id) return
    ;(async () => {
      const res = await authenticatedFetch(`/api/resumes/${id}`)
      const j = await res.json()
      if (res.ok && j?.content_json) {
        const p = j.content_json.personal || {}
        setForm({
          fullName: p.full_name || '',
          title: p.title || '',
          phone: p.phone || '',
          email: p.email || '',
          linkedin: p.linkedin || '',
          portfolio: p.portfolio || '',
          summary: j.content_json.summary || ''
        })
        setEducation((j.content_json.education || []).map((e: { school?: string; degree?: string; year?: string }) => ({ school: e.school || '', degree: e.degree || '', year: e.year || '' })))
        setExperience((j.content_json.experience || []).map((e: { company?: string; role?: string; from?: string; to?: string; highlights?: string[] }) => ({ company: e.company || '', role: e.role || '', from: e.from || '', to: e.to || '', highlights: (e.highlights || []).join('\n') })))
        setProjects((j.content_json.projects || []).map((e: { name?: string; description?: string; highlights?: string[] }) => ({ name: e.name || '', description: e.description || '', highlights: (e.highlights || []).join('\n') })))
        setSkills(j.content_json.skills || [])
        setCerts(j.content_json.certificates || [])
        setDirty(false)
      }
    })()
  }, [])

  useEffect(() => { void lastSaveRef.current }, [])

  async function save(): Promise<boolean> {
    const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
    const payload = { content_json: { personal: { full_name: form.fullName, title: form.title, phone: form.phone, email: form.email, linkedin: form.linkedin, portfolio: form.portfolio }, summary: form.summary, education, experience: experience.map(e => ({ ...e, highlights: e.highlights.split('\n').filter(Boolean) })), projects: projects.map(p => ({ ...p, highlights: p.highlights.split('\n').filter(Boolean) })), skills, certificates: certs }, title: form.fullName ? `${form.fullName} 的简历` : undefined, template, color_theme: color }
    const res = await authenticatedFetch(`/api/resumes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    if (res.ok) { setSavedText('已保存'); setDirty(false); try { localStorage.removeItem(`resume_draft_${id}`) } catch {}; return true } else { setSavedText('保存失败'); try { localStorage.setItem(`resume_draft_${id}`, JSON.stringify(payload)) } catch {}; return false }
  }

  async function saveWithRetry() {
    const now = Date.now()
    if (now - lastSaveRef.current < 300) return
    lastSaveRef.current = now
    let attempt = 0
    while (attempt < 3) {
      const before = Date.now()
      const ok = await save()
      if (ok) break
      attempt++
      const backoff = 250 * Math.pow(2, attempt - 1)
      await new Promise(r => setTimeout(r, backoff))
      if (Date.now() - before < backoff) await new Promise(r => setTimeout(r, backoff - (Date.now() - before)))
    }
  }

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
    const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
    const res = await authenticatedFetch('/api/share', { method: 'POST', body: JSON.stringify({ permission: 'public', resume_id: id }) })
    const data = await res.json()
    setShareUrl(`${location.origin}/s/${data.share_uuid}`)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-[#E9ECEF] px-6 py-3 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-2xl">star</span>
          <h2 className="text-lg font-bold">简历编辑器</h2>
          <span className="text-xs font-medium text-[#6C757D] ml-2">{savedText}</span>
        </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">模板:</span>
              <select className="h-10 rounded-lg border-[#E9ECEF] bg-[#f6f7f8] px-2" value={template} onChange={e => setTemplate(e.target.value)}>
                <option>Modern</option>
                <option>Classic</option>
                <option>Creative</option>
              </select>
            </div>
          <div className="flex gap-2">
            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold" onClick={generatePDF}>
              <span className="material-symbols-outlined text-base">download</span>
              <span>导出 PDF</span>
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-[#E9ECEF] text-[#212529] text-sm font-bold" onClick={createShare}>
              <span className="material-symbols-outlined text-base">share</span>
              <span>分享链接</span>
            </button>
          </div>
          {shareUrl && (
            <input className="h-10 w-64 border rounded-lg px-3" readOnly value={shareUrl} />
          )}
        </div>
      </header>
      <main className="flex-grow grid grid-cols-12 overflow-hidden">
      <section className="col-span-5 bg-white p-6 overflow-y-auto border-r border-[#E9ECEF]">
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group" open>
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">个人信息</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input className="h-11 border rounded-lg px-3" placeholder="姓名" value={form.fullName} onChange={e => update('fullName', e.target.value)} />
              <input className="h-11 border rounded-lg px-3" placeholder="职称" value={form.title} onChange={e => update('title', e.target.value)} />
              <input className="h-11 border rounded-lg px-3" placeholder="电话" value={form.phone} onChange={e => update('phone', e.target.value)} />
              <input className="h-11 border rounded-lg px-3" placeholder="邮箱" value={form.email} onChange={e => update('email', e.target.value)} />
              <input className="h-11 border rounded-lg px-3" placeholder="LinkedIn" value={form.linkedin} onChange={e => update('linkedin', e.target.value)} />
              <input className="h-11 border rounded-lg px-3" placeholder="作品集" value={form.portfolio} onChange={e => update('portfolio', e.target.value)} />
            </div>
          </div>
        </details>
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">个人简介</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2 space-y-2">
            <div className="rounded-lg border border-[#E9ECEF] bg-white">
              <div className="flex items-center p-2 border-b border-[#E9ECEF] gap-1">
                <button className="p-1.5 rounded hover:bg-[#E9ECEF]" onClick={() => { const el = summaryRef.current; if (!el) return; const { selectionStart, selectionEnd, value } = el; const selected = value.slice(selectionStart, selectionEnd); const next = value.slice(0, selectionStart) + `**${selected}**` + value.slice(selectionEnd); el.value = next; update('summary', next); el.focus(); const pos = selectionStart + 2 + selected.length + 2; el.selectionStart = el.selectionEnd = pos }}><span className="material-symbols-outlined text-lg">format_bold</span></button>
                <button className="p-1.5 rounded hover:bg-[#E9ECEF]" onClick={() => { const el = summaryRef.current; if (!el) return; const { selectionStart, selectionEnd, value } = el; const selected = value.slice(selectionStart, selectionEnd); const next = value.slice(0, selectionStart) + `*${selected}*` + value.slice(selectionEnd); el.value = next; update('summary', next); el.focus(); const pos = selectionStart + 1 + selected.length + 1; el.selectionStart = el.selectionEnd = pos }}><span className="material-symbols-outlined text-lg">format_italic</span></button>
                <button className="p-1.5 rounded hover:bg-[#E9ECEF]" onClick={() => { const el = summaryRef.current; if (!el) return; const { selectionStart, value } = el; const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1; const next = value.slice(0, lineStart) + '- ' + value.slice(lineStart); el.value = next; update('summary', next); el.focus(); const pos = selectionStart + 2; el.selectionStart = el.selectionEnd = pos }}><span className="material-symbols-outlined text-lg">format_list_bulleted</span></button>
              </div>
              <textarea ref={summaryRef} className="w-full text-sm bg-transparent h-32 resize-none p-3" placeholder="撰写个人简介（支持 Markdown）" value={form.summary} onChange={e => update('summary', e.target.value)} />
            </div>
          </div>
        </details>
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">教育经历</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2 space-y-3">
            {education.map((e, idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2">
                <input className="h-10 border rounded-lg px-3" placeholder="学校" value={e.school} onChange={ev => setEducation(prev => prev.map((x,i)=> i===idx?{...x, school: ev.target.value}:x))} />
                <input className="h-10 border rounded-lg px-3" placeholder="学位" value={e.degree} onChange={ev => setEducation(prev => prev.map((x,i)=> i===idx?{...x, degree: ev.target.value}:x))} />
                <input className="h-10 border rounded-lg px-3" placeholder="年份" value={e.year} onChange={ev => setEducation(prev => prev.map((x,i)=> i===idx?{...x, year: ev.target.value}:x))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setEducation(prev => [...prev, { school: '', degree: '', year: '' }])}>添加</button>
              {education.length>0 && <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setEducation(prev => prev.slice(0,-1))}>删除最后一项</button>}
            </div>
          </div>
        </details>
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">工作经历</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2 space-y-3">
            {experience.map((e, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <input className="h-10 border rounded-lg px-3" placeholder="公司" value={e.company} onChange={ev => setExperience(prev => prev.map((x,i)=> i===idx?{...x, company: ev.target.value}:x))} />
                <input className="h-10 border rounded-lg px-3" placeholder="职位" value={e.role} onChange={ev => setExperience(prev => prev.map((x,i)=> i===idx?{...x, role: ev.target.value}:x))} />
                <input className="h-10 border rounded-lg px-3" placeholder="开始" value={e.from} onChange={ev => setExperience(prev => prev.map((x,i)=> i===idx?{...x, from: ev.target.value}:x))} />
                <input className="h-10 border rounded-lg px-3" placeholder="结束" value={e.to} onChange={ev => setExperience(prev => prev.map((x,i)=> i===idx?{...x, to: ev.target.value}:x))} />
                <textarea className="col-span-2 h-24 border rounded-lg px-3" placeholder="亮点（每行一条）" value={e.highlights} onChange={ev => setExperience(prev => prev.map((x,i)=> i===idx?{...x, highlights: ev.target.value}:x))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setExperience(prev => [...prev, { company: '', role: '', from: '', to: '', highlights: '' }])}>添加</button>
              {experience.length>0 && <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setExperience(prev => prev.slice(0,-1))}>删除最后一项</button>}
            </div>
          </div>
        </details>
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">项目经验</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2 space-y-3">
            {projects.map((p, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-2">
                <input className="h-10 border rounded-lg px-3" placeholder="项目名称" value={p.name} onChange={ev => setProjects(prev => prev.map((x,i)=> i===idx?{...x, name: ev.target.value}:x))} />
                <input className="h-10 border rounded-lg px-3" placeholder="项目描述" value={p.description} onChange={ev => setProjects(prev => prev.map((x,i)=> i===idx?{...x, description: ev.target.value}:x))} />
                <textarea className="col-span-2 h-24 border rounded-lg px-3" placeholder="亮点（每行一条）" value={p.highlights} onChange={ev => setProjects(prev => prev.map((x,i)=> i===idx?{...x, highlights: ev.target.value}:x))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setProjects(prev => [...prev, { name: '', description: '', highlights: '' }])}>添加</button>
              {projects.length>0 && <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setProjects(prev => prev.slice(0,-1))}>删除最后一项</button>}
            </div>
          </div>
        </details>
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">技能</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2">
            <div className="flex gap-2">
              <input className="h-10 border rounded-lg px-3 flex-1" placeholder="添加技能" onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setSkills(prev => [...prev, v]); (e.target as HTMLInputElement).value=''; } } }} />
              {skills.length>0 && <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setSkills(prev => prev.slice(0,-1))}>删除最后一项</button>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((s, i) => (<span key={i} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">{s}</span>))}
            </div>
          </div>
        </details>
        <details className="flex flex-col rounded-lg border border-[#E9ECEF] bg-[#f6f7f8] px-4 group">
          <summary className="flex cursor-pointer items-center justify-between gap-6 py-3">
            <p className="text-sm font-medium">证书</p>
            <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="pb-4 pt-2">
            <div className="flex gap-2">
              <input className="h-10 border rounded-lg px-3 flex-1" placeholder="添加证书" onKeyDown={e => { if (e.key==='Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setCerts(prev => [...prev, v]); (e.target as HTMLInputElement).value=''; } } }} />
              {certs.length>0 && <button className="h-9 px-3 rounded-lg bg-gray-100" onClick={() => setCerts(prev => prev.slice(0,-1))}>删除最后一项</button>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {certs.map((s, i) => (<span key={i} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#eeeeee', color: '#4a4a4a' }}>{s}</span>))}
            </div>
          </div>
        </details>
      </section>
      <section className="col-span-7 bg-[#f6f7f8] p-6 overflow-y-auto flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 mb-4 sticky top-0 bg-[#f6f7f8] py-2 z-10">
          <button className="p-2 rounded-lg bg-white shadow-sm" onClick={() => setScale(prev => Math.max(0.5, +(prev - 0.1).toFixed(2)))}><span className="material-symbols-outlined">zoom_out</span></button>
          <span className="text-sm font-medium w-16 text-center">{Math.round(scale*100)}%</span>
          <button className="p-2 rounded-lg bg-white shadow-sm" onClick={() => setScale(prev => Math.min(2, +(prev + 0.1).toFixed(2)))}><span className="material-symbols-outlined">zoom_in</span></button>
        </div>
        <div ref={previewRef} className="bg-white rounded-lg shadow w-full max-w-[210mm] min-h-[297mm] p-10 text-[#0d0d0d]" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          <header className="text-center border-b-2 pb-4 mb-6" style={{ borderColor: '#0d0d0d' }}>
            <h1 className="text-4xl font-bold">{form.fullName || '姓名'}</h1>
            <p className="text-lg mt-1">{form.title || '职称'}</p>
            <div className="flex items-center justify-center gap-4 text-sm mt-2" style={{ color: '#666666' }}>
              {form.phone && <span>{form.phone}</span>}
              {form.email && <span>|</span>}
              {form.email && <span>{form.email}</span>}
              {(form.linkedin || form.portfolio) && <span>|</span>}
              {form.linkedin && <span>{form.linkedin}</span>}
              {form.portfolio && <span>{form.portfolio}</span>}
            </div>
          </header>
          <section>
            <h2 className="text-lg font-bold border-b pb-2 mb-3">职业概述</h2>
            <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.summary || '在此填写个人简介。') }} />
          </section>
          <section className="mt-6">
            <h2 className="text-lg font-bold border-b pb-2 mb-3">教育经历</h2>
            <div className="space-y-3">
              {education.map((e, i) => (
                <div key={i}>
                  <div className="flex justify-between"><span className="font-bold">{e.degree}</span><span className="text-sm" style={{ color: '#666666' }}>{e.year}</span></div>
                  <p className="text-sm italic">{e.school}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-6">
            <h2 className="text-lg font-bold border-b pb-2 mb-3">工作经历</h2>
            <div className="space-y-4">
              {experience.map((e, i) => (
                <div key={i}>
                  <div className="flex justify-between"><span className="font-bold">{e.role}</span><span className="text-sm" style={{ color: '#666666' }}>{e.from} - {e.to}</span></div>
                  <p className="text-sm italic">{e.company}</p>
                  <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                    {e.highlights.split('\n').filter(Boolean).map((h, idx) => (<li key={idx}>{h}</li>))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-6">
            <h2 className="text-lg font-bold border-b pb-2 mb-3">项目经验</h2>
            <div className="space-y-4">
              {projects.map((p, i) => (
                <div key={i}>
                  <div className="flex justify-between"><span className="font-bold">{p.name}</span></div>
                  <p className="text-sm italic">{p.description}</p>
                  <ul className="list-disc pl-5 mt-2 text-sm space-y-1">
                    {p.highlights.split('\n').filter(Boolean).map((h, idx) => (<li key={idx}>{h}</li>))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
          <section className="mt-6">
            <h2 className="text-lg font-bold border-b pb-2 mb-3">技能</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {skills.map((s, i) => (<span key={i} className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: '#eeeeee', color: '#4a4a4a' }}>{s}</span>))}
            </div>
          </section>
          <section className="mt-6">
            <h2 className="text-lg font-bold border-b pb-2 mb-3">证书</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {certs.map((s, i) => (<span key={i} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">{s}</span>))}
            </div>
          </section>
          <div className="mt-6">
            <button className="h-10 px-4 rounded-lg bg-primary text-white font-bold" onClick={saveWithRetry}>保存</button>
          </div>
        </div>
      </section>
      </main>
    </div>
  )
}