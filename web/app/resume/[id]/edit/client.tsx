'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { ResumeView } from '@/components/resume-view'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Award,
  Bold,
  Briefcase,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderGit2,
  GraduationCap,
  Italic,
  List,
  Plus,
  Save,
  Share2,
  Sparkles,
  Trash2,
  User,
  Wrench,
  X,
} from 'lucide-react'

type EducationItem = { school: string; degree: string; year: string }
type ExperienceItem = { company: string; role: string; from: string; to: string; highlights: string }
type ProjectItem = { name: string; description: string; highlights: string }
type SectionKey = 'personal' | 'summary' | 'experience' | 'projects' | 'education' | 'skills'

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: 'personal', label: '基本信息' },
  { key: 'summary', label: '职业摘要' },
  { key: 'experience', label: '工作经历' },
  { key: 'projects', label: '项目经历' },
  { key: 'education', label: '教育经历' },
  { key: 'skills', label: '技能证书' },
]

const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean)

export default function ResumeEditPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const summaryRef = useRef<HTMLTextAreaElement>(null)
  const [form, setForm] = useState({ fullName: '', title: '', phone: '', email: '', linkedin: '', portfolio: '', summary: '' })
  const [template, setTemplate] = useState('Modern')
  const [color] = useState('#0d0d0d')
  const [education, setEducation] = useState<EducationItem[]>([])
  const [experience, setExperience] = useState<ExperienceItem[]>([])
  const [projects, setProjects] = useState<ProjectItem[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [certs, setCerts] = useState<string[]>([])
  const [savedText, setSavedText] = useState('Unsaved')
  const [dirty, setDirty] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [mobilePreview, setMobilePreview] = useState(false)
  const [hideHint, setHideHint] = useState(false)
  const lastSaveRef = useRef(0)

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const scrollTo = (section: SectionKey) => document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  useEffect(() => {
    async function load() {
      const res = await authenticatedFetch(`/api/resumes/${id}`)
      const data = await res.json()
      if (!res.ok || !data?.content_json) return
      const personal = data.content_json.personal || {}
      setForm({
        fullName: personal.full_name || '',
        title: personal.title || '',
        phone: personal.phone || '',
        email: personal.email || '',
        linkedin: personal.linkedin || '',
        portfolio: personal.portfolio || '',
        summary: data.content_json.summary || '',
      })
      setEducation((data.content_json.education || []).map((item: EducationItem) => ({ school: item.school || '', degree: item.degree || '', year: item.year || '' })))
      setExperience((data.content_json.experience || []).map((item: { company?: string; role?: string; from?: string; to?: string; highlights?: string[] }) => ({
        company: item.company || '', role: item.role || '', from: item.from || '', to: item.to || '', highlights: (item.highlights || []).join('\n'),
      })))
      setProjects((data.content_json.projects || []).map((item: { name?: string; description?: string; highlights?: string[] }) => ({
        name: item.name || '', description: item.description || '', highlights: (item.highlights || []).join('\n'),
      })))
      setSkills(data.content_json.skills || [])
      setCerts(data.content_json.certificates || [])
      setTemplate(data.template || 'Modern')
      setSavedText('Saved')
      setDirty(false)
    }
    if (id) void load()
  }, [id])

  useEffect(() => {
    const requested = searchParams.get('section') as SectionKey | null
    if (requested) window.setTimeout(() => scrollTo(requested), 250)
  }, [searchParams])

  async function save(): Promise<boolean> {
    const payload = {
      content_json: {
        personal: { full_name: form.fullName, title: form.title, phone: form.phone, email: form.email, linkedin: form.linkedin, portfolio: form.portfolio },
        summary: form.summary,
        education,
        experience: experience.map((item) => ({ ...item, highlights: splitLines(item.highlights) })),
        projects: projects.map((item) => ({ ...item, highlights: splitLines(item.highlights) })),
        skills,
        certificates: certs,
      },
      title: form.fullName ? `${form.fullName} Resume` : undefined,
      template,
      color_theme: color,
    }
    const res = await authenticatedFetch(`/api/resumes/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
    if (res.ok) { setSavedText('Saved'); setDirty(false); return true }
    setSavedText('Save Failed')
    return false
  }

  async function saveWithRetry() {
    const now = Date.now()
    if (now - lastSaveRef.current < 300) return
    lastSaveRef.current = now
    setSavedText('Saving...')
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (await save()) return
      await new Promise((resolve) => setTimeout(resolve, 250 * Math.pow(2, attempt)))
    }
  }

  async function createShare() {
    const res = await authenticatedFetch('/api/share', { method: 'POST', body: JSON.stringify({ permission: 'public', resume_id: id }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.share_uuid) { setSavedText(data.error || 'Share Failed'); return }
    setShareUrl(`${location.origin}/s/${data.share_uuid}`)
  }

  function wrapSelection(wrapper: string) {
    const element = summaryRef.current
    if (!element) return
    const { selectionStart, selectionEnd, value } = element
    update('summary', value.slice(0, selectionStart) + wrapper + value.slice(selectionStart, selectionEnd) + wrapper + value.slice(selectionEnd))
  }

  const previewData = {
    resume: { color_theme: color, template },
    content: {
      content_json: {
        personal: { full_name: form.fullName, title: form.title, phone: form.phone, email: form.email, linkedin: form.linkedin, portfolio: form.portfolio },
        summary: form.summary,
        education,
        experience: experience.map((item) => ({ ...item, highlights: splitLines(item.highlights) })),
        projects: projects.map((item) => ({ ...item, highlights: splitLines(item.highlights) })),
        skills,
        certificates: certs,
      },
    },
  }

  const filledSections = [form.fullName || form.title || form.email, form.summary, experience.length, projects.length, education.length, skills.length + certs.length].filter(Boolean).length
  const routeHint = hideHint ? '' : searchParams.get('hint') || ''

  return (
    <div className="min-h-screen atelier-app-bg atelier-grid-bg">
      <header className="atelier-topbar sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:px-6 no-print">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-lg font-semibold">Resume Editor</h1>
            <p className={cn('text-xs font-medium', dirty ? 'text-amber-700' : 'text-emerald-700')}>{dirty ? 'Unsaved changes' : savedText}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="hidden rounded-xl border bg-background/90 p-1 md:flex">
            {['Modern', 'Classic', 'Creative'].map((option) => (
              <Button key={option} variant={template === option ? 'secondary' : 'ghost'} size="sm" onClick={() => { setTemplate(option); setDirty(true) }}>{option}</Button>
            ))}
          </div>
          <Button variant="outline" size="sm" asChild className="hidden lg:inline-flex"><Link href={`/resume/${id}/analysis`}><Sparkles className="mr-2 h-4 w-4" />AI Analysis</Link></Button>
          <Button variant="outline" size="sm" onClick={() => setMobilePreview(true)} className="lg:hidden"><Eye className="mr-2 h-4 w-4" />预览</Button>
          <Button variant="ghost" size="sm" onClick={saveWithRetry}><Save className="mr-2 h-4 w-4" />保存</Button>
          <Button variant="ghost" size="sm" onClick={createShare}><Share2 className="mr-2 h-4 w-4" />分享</Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />导出</Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1600px] gap-6 p-4 md:p-6 lg:grid-cols-[220px_minmax(0,1fr)_minmax(460px,0.95fr)]">
        <aside className="hidden lg:block no-print">
          <div className="sticky top-24 space-y-4">
            <Card className="atelier-panel p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Progress</p>
              <p className="mt-2 text-3xl font-semibold">{filledSections}/6</p>
              <p className="mt-1 text-sm text-muted-foreground">个模块已进入可投递状态</p>
            </Card>
            <Card className="atelier-panel p-3">
              {sections.map((section) => (
                <button key={section.key} type="button" className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-muted/50" onClick={() => scrollTo(section.key)}>
                  <span className="text-sm font-medium">{section.label}</span>
                  <span className="text-xs text-muted-foreground">跳转</span>
                </button>
              ))}
            </Card>
          </div>
        </aside>

        <section className="space-y-6 no-print">
          <Card className="atelier-panel p-5">
            <h2 className="text-2xl font-semibold">边编辑，边看最终版式</h2>
            <p className="mt-2 text-sm text-muted-foreground">模板切换现在会直接影响右侧实时预览和导出结果。分析页与 JD Match 会回跳到对应模块。</p>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {sections.map((section) => <Button key={section.key} variant="outline" size="sm" onClick={() => scrollTo(section.key)}>{section.label}</Button>)}
            </div>
          </Card>

          {routeHint && (
            <Card className="border-primary/25 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary">AI Focus</p>
                  <p className="mt-2 text-sm leading-6">{routeHint}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setHideHint(true)}><X className="h-4 w-4" /></Button>
              </div>
            </Card>
          )}

          <Card id="section-personal" className="atelier-panel p-6">
            <SectionHeader icon={User} title="基本信息" subtitle="抬头的可信度决定简历是否被继续读下去。" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Full Name"><Input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></Field>
              <Field label="Job Title"><Input value={form.title} onChange={(event) => update('title', event.target.value)} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(event) => update('email', event.target.value)} /></Field>
              <Field label="LinkedIn"><Input value={form.linkedin} onChange={(event) => update('linkedin', event.target.value)} /></Field>
              <Field label="Portfolio"><Input value={form.portfolio} onChange={(event) => update('portfolio', event.target.value)} /></Field>
            </div>
          </Card>

          <Card id="section-summary" className="atelier-panel p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <SectionHeader icon={FileText} title="职业摘要" subtitle="先写定位，再写经验与结果，避免空泛自我评价。" />
              <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => wrapSelection('**')}><Bold className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => wrapSelection('*')}><Italic className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => update('summary', `${form.summary}${form.summary.endsWith('\n') || !form.summary ? '' : '\n'}- `)}><List className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <Textarea ref={summaryRef} value={form.summary} onChange={(event) => update('summary', event.target.value)} className="min-h-[180px] bg-background/80 leading-6" />
          </Card>

          <StackCard id="section-experience" icon={Briefcase} title="工作经历" subtitle="多写结果，少写职责。">
            {experience.map((item, index) => (
              <ItemCard key={index} title={`经历 ${index + 1}`} onRemove={() => { setExperience((prev) => prev.filter((_, i) => i !== index)); setDirty(true) }}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input placeholder="Company" value={item.company} onChange={(event) => { setExperience((prev) => prev.map((row, i) => i === index ? { ...row, company: event.target.value } : row)); setDirty(true) }} />
                  <Input placeholder="Role" value={item.role} onChange={(event) => { setExperience((prev) => prev.map((row, i) => i === index ? { ...row, role: event.target.value } : row)); setDirty(true) }} />
                  <Input placeholder="Start Date" value={item.from} onChange={(event) => { setExperience((prev) => prev.map((row, i) => i === index ? { ...row, from: event.target.value } : row)); setDirty(true) }} />
                  <Input placeholder="End Date" value={item.to} onChange={(event) => { setExperience((prev) => prev.map((row, i) => i === index ? { ...row, to: event.target.value } : row)); setDirty(true) }} />
                </div>
                <Textarea className="mt-3 min-h-[120px]" value={item.highlights} onChange={(event) => { setExperience((prev) => prev.map((row, i) => i === index ? { ...row, highlights: event.target.value } : row)); setDirty(true) }} />
              </ItemCard>
            ))}
            <Button variant="outline" onClick={() => { setExperience((prev) => [...prev, { company: '', role: '', from: '', to: '', highlights: '' }]); setDirty(true) }}><Plus className="mr-2 h-4 w-4" />添加经历</Button>
            {experience.length === 0 && <EmptyState text="至少补充 1 段真实经历，AI 分析和 JD Match 才有判断基础。" />}
          </StackCard>

          <StackCard id="section-projects" icon={FolderGit2} title="项目经历" subtitle="突出代表性成果和技术栈。">
            {projects.map((item, index) => (
              <ItemCard key={index} title={`项目 ${index + 1}`} onRemove={() => { setProjects((prev) => prev.filter((_, i) => i !== index)); setDirty(true) }}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input placeholder="Project Name" value={item.name} onChange={(event) => { setProjects((prev) => prev.map((row, i) => i === index ? { ...row, name: event.target.value } : row)); setDirty(true) }} />
                  <Input placeholder="Short Description" value={item.description} onChange={(event) => { setProjects((prev) => prev.map((row, i) => i === index ? { ...row, description: event.target.value } : row)); setDirty(true) }} />
                </div>
                <Textarea className="mt-3 min-h-[120px]" value={item.highlights} onChange={(event) => { setProjects((prev) => prev.map((row, i) => i === index ? { ...row, highlights: event.target.value } : row)); setDirty(true) }} />
              </ItemCard>
            ))}
            <Button variant="outline" onClick={() => { setProjects((prev) => [...prev, { name: '', description: '', highlights: '' }]); setDirty(true) }}><Plus className="mr-2 h-4 w-4" />添加项目</Button>
            {projects.length === 0 && <EmptyState text="适合补足作品、技术、跨团队协作和业务影响。" />}
          </StackCard>

          <StackCard id="section-education" icon={GraduationCap} title="教育经历" subtitle="保持时间线清晰。">
            {education.map((item, index) => (
              <ItemCard key={index} title={`教育 ${index + 1}`} onRemove={() => { setEducation((prev) => prev.filter((_, i) => i !== index)); setDirty(true) }}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Input placeholder="School" value={item.school} onChange={(event) => { setEducation((prev) => prev.map((row, i) => i === index ? { ...row, school: event.target.value } : row)); setDirty(true) }} />
                  <Input placeholder="Degree" value={item.degree} onChange={(event) => { setEducation((prev) => prev.map((row, i) => i === index ? { ...row, degree: event.target.value } : row)); setDirty(true) }} />
                  <Input placeholder="Year" value={item.year} onChange={(event) => { setEducation((prev) => prev.map((row, i) => i === index ? { ...row, year: event.target.value } : row)); setDirty(true) }} />
                </div>
              </ItemCard>
            ))}
            <Button variant="outline" onClick={() => { setEducation((prev) => [...prev, { school: '', degree: '', year: '' }]); setDirty(true) }}><Plus className="mr-2 h-4 w-4" />添加教育</Button>
            {education.length === 0 && <EmptyState text="建议至少保留一条学历信息。" />}
          </StackCard>

          <Card id="section-skills" className="atelier-panel p-6">
            <SectionHeader icon={Wrench} title="技能与证书" subtitle="关键词命中率与可信证明。" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium"><Wrench className="h-4 w-4 text-primary" />Skills</div>
                <Input placeholder="输入技能后按 Enter" onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  const value = (event.target as HTMLInputElement).value.trim()
                  if (!value) return
                  setSkills((prev) => [...prev, value]); (event.target as HTMLInputElement).value = ''; setDirty(true)
                }} />
                <TagList items={skills} onRemove={(index) => { setSkills((prev) => prev.filter((_, i) => i !== index)); setDirty(true) }} />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium"><Award className="h-4 w-4 text-primary" />Certificates</div>
                <Input placeholder="输入证书后按 Enter" onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  const value = (event.target as HTMLInputElement).value.trim()
                  if (!value) return
                  setCerts((prev) => [...prev, value]); (event.target as HTMLInputElement).value = ''; setDirty(true)
                }} />
                <TagList items={certs} onRemove={(index) => { setCerts((prev) => prev.filter((_, i) => i !== index)); setDirty(true) }} />
              </div>
            </div>
          </Card>
        </section>

        <section className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <Card className="atelier-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Live Preview</p>
                  <h2 className="mt-1 text-xl font-semibold">{template} Template</h2>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">Print-ready</span>
              </div>
            </Card>
            <div className="max-h-[calc(100vh-9rem)] overflow-auto rounded-[28px] border border-border/70 bg-muted/25 p-4">
              <ResumeView data={previewData} />
            </div>
          </div>
        </section>
      </main>

      {mobilePreview && (
        <div className="fixed inset-0 z-40 bg-black/50 p-4 backdrop-blur-sm lg:hidden">
          <div className="flex h-full flex-col rounded-[28px] bg-background">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Mobile Preview</p>
                <h2 className="text-lg font-semibold">{template} Template</h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobilePreview(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex-1 overflow-auto bg-muted/30 p-4">
              <div className="origin-top scale-[0.52] sm:scale-[0.68]">
                <ResumeView data={previewData} />
              </div>
            </div>
          </div>
        </div>
      )}

      {shareUrl && (
        <div className="fixed bottom-4 left-1/2 z-50 flex min-w-[320px] max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-2xl border bg-background p-4 shadow-xl no-print md:min-w-[560px]">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Share Link</p>
            <Input value={shareUrl} readOnly className="mt-2 h-10" onClick={(event) => event.currentTarget.select()} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(shareUrl)}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => window.open(shareUrl, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => setShareUrl('')}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2"><span className="text-sm font-medium text-muted-foreground">{label}</span>{children}</label>
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof User; title: string; subtitle: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-lg font-semibold text-primary">
        <Icon className="h-5 w-5" />
        <h3>{title}</h3>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function StackCard({ id, icon, title, subtitle, children }: { id: string; icon: typeof Briefcase; title: string; subtitle: string; children: React.ReactNode }) {
  return <Card id={id} className="atelier-panel p-6"><SectionHeader icon={icon} title={title} subtitle={subtitle} /><div className="mt-5 space-y-4">{children}</div></Card>
}

function ItemCard({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <Card className="border-border/70 bg-background/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-medium">{title}</h4>
        <Button variant="ghost" size="icon" onClick={onRemove}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
      {children}
    </Card>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">{text}</div>
}

function TagList({ items, onRemove }: { items: string[]; onRemove: (index: number) => void }) {
  if (items.length === 0) return <EmptyState text="还没有添加任何标签。" />
  return <div className="flex flex-wrap gap-2">{items.map((item, index) => <span key={`${item}-${index}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium">{item}<button type="button" onClick={() => onRemove(index)} className="text-muted-foreground hover:text-destructive">×</button></span>)}</div>
}
