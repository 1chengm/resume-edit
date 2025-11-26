'use client'
import { useState, useRef, useEffect } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { authenticatedFetch } from '@/src/lib/authenticatedFetch'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  ArrowLeft,
  Download,
  Share2,
  Save,
  ChevronDown,
  Plus,
  Trash2,
  Bold,
  Italic,
  List,
  ZoomIn,
  ZoomOut,
  User,
  FileText,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Wrench,
  Award,
  Copy,
  ExternalLink,
  X
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

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
  const [savedText, setSavedText] = useState('Unsaved')
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
      ; (async () => {
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
          setSavedText('Saved')
        }
      })()
  }, [])

  useEffect(() => { void lastSaveRef.current }, [])

  async function save(): Promise<boolean> {
    const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
    const payload = { content_json: { personal: { full_name: form.fullName, title: form.title, phone: form.phone, email: form.email, linkedin: form.linkedin, portfolio: form.portfolio }, summary: form.summary, education, experience: experience.map(e => ({ ...e, highlights: e.highlights.split('\n').filter(Boolean) })), projects: projects.map(p => ({ ...p, highlights: p.highlights.split('\n').filter(Boolean) })), skills, certificates: certs }, title: form.fullName ? `${form.fullName} Resume` : undefined, template, color_theme: color }
    const res = await authenticatedFetch(`/api/resumes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    if (res.ok) { setSavedText('Saved'); setDirty(false); try { localStorage.removeItem(`resume_draft_${id}`) } catch { }; return true } else { setSavedText('Save Failed'); try { localStorage.setItem(`resume_draft_${id}`, JSON.stringify(payload)) } catch { }; return false }
  }

  async function saveWithRetry() {
    const now = Date.now()
    if (now - lastSaveRef.current < 300) return
    lastSaveRef.current = now
    setSavedText('Saving...')
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
      alert('Missing Resume ID')
      return
    }
    window.print();

    try {
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
    <div className="flex flex-col h-screen bg-muted/10">
      {/* Header */}
      <header className="h-16 border-b bg-background flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold leading-tight">Resume Editor</h2>
            <span className={cn("text-xs font-medium", dirty ? "text-yellow-600" : "text-muted-foreground")}>
              {dirty ? "Unsaved changes" : savedText}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
            <Button
              variant={template === 'Modern' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTemplate('Modern')}
              className="h-8 text-xs"
            >
              Modern
            </Button>
            <Button
              variant={template === 'Classic' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTemplate('Classic')}
              className="h-8 text-xs"
            >
              Classic
            </Button>
            <Button
              variant={template === 'Creative' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTemplate('Creative')}
              className="h-8 text-xs"
            >
              Creative
            </Button>
          </div>

          <div className="h-6 w-px bg-border mx-2 hidden md:block"></div>

          <Button variant="outline" size="sm" onClick={saveWithRetry} className="gap-2">
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button variant="outline" size="sm" onClick={createShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button size="sm" onClick={generatePDF} className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex overflow-hidden">
        {/* Editor Panel */}
        <section className="w-full lg:w-1/2 xl:w-2/5 bg-background border-r overflow-y-auto p-6 space-y-6 no-print">

          {/* Personal Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-primary">
              <User className="h-5 w-5" />
              <h3>Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Job Title</label>
                <Input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Software Engineer" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={form.email} onChange={e => update('email', e.target.value)} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">LinkedIn</label>
                <Input value={form.linkedin} onChange={e => update('linkedin', e.target.value)} placeholder="linkedin.com/in/johndoe" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Portfolio</label>
                <Input value={form.portfolio} onChange={e => update('portfolio', e.target.value)} placeholder="johndoe.com" />
              </div>
            </div>
          </div>

          <div className="h-px bg-border"></div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <FileText className="h-5 w-5" />
                <h3>Professional Summary</h3>
              </div>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-md">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { const el = summaryRef.current; if (!el) return; const { selectionStart, selectionEnd, value } = el; const selected = value.slice(selectionStart, selectionEnd); const next = value.slice(0, selectionStart) + `**${selected}**` + value.slice(selectionEnd); el.value = next; update('summary', next); el.focus(); const pos = selectionStart + 2 + selected.length + 2; el.selectionStart = el.selectionEnd = pos }}>
                  <Bold className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { const el = summaryRef.current; if (!el) return; const { selectionStart, selectionEnd, value } = el; const selected = value.slice(selectionStart, selectionEnd); const next = value.slice(0, selectionStart) + `*${selected}*` + value.slice(selectionEnd); el.value = next; update('summary', next); el.focus(); const pos = selectionStart + 1 + selected.length + 1; el.selectionStart = el.selectionEnd = pos }}>
                  <Italic className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { const el = summaryRef.current; if (!el) return; const { selectionStart, value } = el; const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1; const next = value.slice(0, lineStart) + '- ' + value.slice(lineStart); el.value = next; update('summary', next); el.focus(); const pos = selectionStart + 2; el.selectionStart = el.selectionEnd = pos }}>
                  <List className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Textarea
              ref={summaryRef}
              value={form.summary}
              onChange={e => update('summary', e.target.value)}
              placeholder="Write a brief summary of your professional background..."
              className="min-h-[120px]"
            />
          </div>

          <div className="h-px bg-border"></div>

          {/* Education */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <GraduationCap className="h-5 w-5" />
                <h3>Education</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEducation(prev => [...prev, { school: '', degree: '', year: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-4">
              {education.map((e, idx) => (
                <Card key={idx} className="p-4 relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    onClick={() => setEducation(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                    <Input placeholder="School / University" value={e.school} onChange={ev => setEducation(prev => prev.map((x, i) => i === idx ? { ...x, school: ev.target.value } : x))} />
                    <Input placeholder="Degree / Major" value={e.degree} onChange={ev => setEducation(prev => prev.map((x, i) => i === idx ? { ...x, degree: ev.target.value } : x))} />
                    <Input placeholder="Year / Period" value={e.year} onChange={ev => setEducation(prev => prev.map((x, i) => i === idx ? { ...x, year: ev.target.value } : x))} />
                  </div>
                </Card>
              ))}
              {education.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
                  No education added yet.
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border"></div>

          {/* Experience */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Briefcase className="h-5 w-5" />
                <h3>Experience</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setExperience(prev => [...prev, { company: '', role: '', from: '', to: '', highlights: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-4">
              {experience.map((e, idx) => (
                <Card key={idx} className="p-4 relative group space-y-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    onClick={() => setExperience(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                    <Input placeholder="Company" value={e.company} onChange={ev => setExperience(prev => prev.map((x, i) => i === idx ? { ...x, company: ev.target.value } : x))} />
                    <Input placeholder="Role / Title" value={e.role} onChange={ev => setExperience(prev => prev.map((x, i) => i === idx ? { ...x, role: ev.target.value } : x))} />
                    <Input placeholder="Start Date" value={e.from} onChange={ev => setExperience(prev => prev.map((x, i) => i === idx ? { ...x, from: ev.target.value } : x))} />
                    <Input placeholder="End Date" value={e.to} onChange={ev => setExperience(prev => prev.map((x, i) => i === idx ? { ...x, to: ev.target.value } : x))} />
                  </div>
                  <Textarea
                    placeholder="Key achievements and responsibilities (one per line)"
                    value={e.highlights}
                    onChange={ev => setExperience(prev => prev.map((x, i) => i === idx ? { ...x, highlights: ev.target.value } : x))}
                    className="min-h-[100px]"
                  />
                </Card>
              ))}
              {experience.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
                  No experience added yet.
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border"></div>

          {/* Projects */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <FolderGit2 className="h-5 w-5" />
                <h3>Projects</h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => setProjects(prev => [...prev, { name: '', description: '', highlights: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-4">
              {projects.map((p, idx) => (
                <Card key={idx} className="p-4 relative group space-y-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    onClick={() => setProjects(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-8">
                    <Input placeholder="Project Name" value={p.name} onChange={ev => setProjects(prev => prev.map((x, i) => i === idx ? { ...x, name: ev.target.value } : x))} />
                    <Input placeholder="Short Description" value={p.description} onChange={ev => setProjects(prev => prev.map((x, i) => i === idx ? { ...x, description: ev.target.value } : x))} />
                  </div>
                  <Textarea
                    placeholder="Key features and tech stack (one per line)"
                    value={p.highlights}
                    onChange={ev => setProjects(prev => prev.map((x, i) => i === idx ? { ...x, highlights: ev.target.value } : x))}
                    className="min-h-[100px]"
                  />
                </Card>
              ))}
              {projects.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-lg text-muted-foreground text-sm">
                  No projects added yet.
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border"></div>

          {/* Skills & Certs */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Wrench className="h-5 w-5" />
                <h3>Skills</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill and press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setSkills(prev => [...prev, v]); (e.target as HTMLInputElement).value = ''; } } }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                    {s}
                    <button onClick={() => setSkills(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-primary">
                <Award className="h-5 w-5" />
                <h3>Certificates</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a certificate and press Enter"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { setCerts(prev => [...prev, v]); (e.target as HTMLInputElement).value = ''; } } }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {certs.map((s, i) => (
                  <span key={i} className="bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                    {s}
                    <button onClick={() => setCerts(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

        </section>

        {/* Preview Panel */}
        <section className="hidden lg:flex flex-1 bg-muted/30 p-8 items-start justify-center overflow-y-auto relative print-visible">
          <div className="fixed bottom-8 right-8 flex flex-col gap-2 z-30 no-print">
            <Button variant="secondary" size="icon" onClick={() => setScale(prev => Math.min(1.5, +(prev + 0.1).toFixed(2)))} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="bg-background text-xs font-medium py-1 px-2 rounded-md shadow text-center border">
              {Math.round(scale * 100)}%
            </div>
            <Button variant="secondary" size="icon" onClick={() => setScale(prev => Math.max(0.5, +(prev - 0.1).toFixed(2)))} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={previewRef}
            className="bg-white shadow-2xl transition-transform duration-200 origin-top resume-print"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '40px',
              transform: `scale(${scale})`,
              marginBottom: `${(scale - 1) * 297}mm` // Add margin to allow scrolling when scaled up
            }}
          >
            {/* Resume Content - Basic Modern Template Style */}
            <header className="border-b-2 pb-6 mb-8" style={{ borderColor: color }}>
              <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color }}>{form.fullName || 'Your Name'}</h1>
              <p className="text-xl text-muted-foreground mb-4">{form.title || 'Professional Title'}</p>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                {form.phone && <span>{form.phone}</span>}
                {form.email && <span>{form.email}</span>}
                {form.linkedin && <span>{form.linkedin}</span>}
                {form.portfolio && <span>{form.portfolio}</span>}
              </div>
            </header>

            <div className="space-y-8">
              {form.summary && (
                <section>
                  <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b pb-1" style={{ color, borderColor: '#eee' }}>Professional Summary</h2>
                  <div className="text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: renderMarkdown(form.summary) }} />
                </section>
              )}

              {experience.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b pb-1" style={{ color, borderColor: '#eee' }}>Experience</h2>
                  <div className="space-y-6">
                    {experience.map((e, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900">{e.role}</h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap">{e.from} – {e.to}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-2">{e.company}</p>
                        <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                          {e.highlights.split('\n').filter(Boolean).map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {projects.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b pb-1" style={{ color, borderColor: '#eee' }}>Projects</h2>
                  <div className="space-y-5">
                    {projects.map((p, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline mb-1">
                          <h3 className="font-bold text-gray-900">{p.name}</h3>
                        </div>
                        <p className="text-sm text-gray-700 mb-2 italic">{p.description}</p>
                        <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                          {p.highlights.split('\n').filter(Boolean).map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {education.length > 0 && (
                <section>
                  <h2 className="text-lg font-bold uppercase tracking-wider mb-4 border-b pb-1" style={{ color, borderColor: '#eee' }}>Education</h2>
                  <div className="space-y-4">
                    {education.map((e, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-baseline">
                          <h3 className="font-bold text-gray-900">{e.school}</h3>
                          <span className="text-sm text-gray-500">{e.year}</span>
                        </div>
                        <p className="text-sm text-gray-700">{e.degree}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(skills.length > 0 || certs.length > 0) && (
                <div className="grid grid-cols-2 gap-8">
                  {skills.length > 0 && (
                    <section>
                      <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b pb-1" style={{ color, borderColor: '#eee' }}>Skills</h2>
                      <div className="flex flex-wrap gap-2">
                        {skills.map((s, i) => (
                          <span key={i} className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{s}</span>
                        ))}
                      </div>
                    </section>
                  )}

                  {certs.length > 0 && (
                    <section>
                      <h2 className="text-lg font-bold uppercase tracking-wider mb-3 border-b pb-1" style={{ color, borderColor: '#eee' }}>Certificates</h2>
                      <ul className="list-disc list-outside ml-4 text-sm text-gray-600 space-y-1">
                        {certs.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {shareUrl && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4 animate-in slide-in-from-bottom-5 min-w-[500px] no-print">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-sm font-medium whitespace-nowrap">Share Link:</div>
            <Input value={shareUrl} readOnly className="h-9 text-sm" onClick={e => e.currentTarget.select()} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  alert('链接已复制到剪贴板')
                }}
                title="copy"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">copy</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={() => window.open(shareUrl, '_blank')}
                title="open"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">open</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                onClick={() => setShareUrl('')}
                title="close"
              >
                <X className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground">close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}