"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LayoutDashboard,
  FileText,
  Plus,
  Search,
  Edit,
  Eye,
  Sparkles,
  Target,
  LogOut,
  Settings,
  HelpCircle,
  User,
  Clock,
  Filter,
  SortAsc,
  Trash2
} from "lucide-react"
import Link from "next/link"

type ResumeItem = {
  id: string
  title: string
  updated_at: string
  template: string
  color_theme: string
  updated_text?: string
}

type DashboardClientProps = {
  initialEmail: string
}

export default function DashboardClient({ initialEmail }: DashboardClientProps) {
  const router = useRouter()
  const [items, setItems] = useState<ResumeItem[]>([])
  const [query, setQuery] = useState('')
  const [chooserOpen, setChooserOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string; } | null>(null)
  const [userEmail] = useState(initialEmail)

  useEffect(() => {
    ; (async () => {
      const [profileResponse, resumesResponse] = await Promise.all([
        authenticatedFetch('/api/profile'),
        authenticatedFetch('/api/resumes'),
      ])

      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData)
      }

      if (resumesResponse.ok) {
        const data = await resumesResponse.json().catch(() => ({ items: [] }))
        const rawItems = Array.isArray(data.items)
          ? (data.items as Array<Omit<ResumeItem, 'updated_text'>>)
          : []
        const now = Date.now()
        const mapped = rawItems.map((d) => {
          const dt = new Date(d.updated_at)
          const diff = Math.max(0, now - dt.getTime())
          const days = Math.floor(diff / (24 * 3600 * 1000))
          let txt = ''
          if (days >= 7) txt = `${Math.floor(days / 7)} weeks ago`
          else if (days >= 1) txt = `${days} days ago`
          else {
            const hours = Math.floor(diff / (3600 * 1000))
            if (hours >= 1) txt = `${hours} hours ago`
            else {
              const mins = Math.floor(diff / (60 * 1000))
              txt = `${mins} mins ago`
            }
          }
          return { ...d, updated_text: txt }
        })
        setItems(mapped)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(it => it.title.toLowerCase().includes(q))
  }, [items, query])

  async function handleCreate(templateId: string, color: string, name: string) {
    setCreating(true)
    try {
      const res = await authenticatedFetch('/api/resumes', {
        method: 'POST',
        body: JSON.stringify({ template: templateId, color_theme: color, title: `${name} Resume` })
      })
      const data = await res.json()
      if (!res.ok || !data?.id) {
        alert(data.error || 'Failed to create resume')
        return
      }
      setChooserOpen(false)
      router.push(`/resume/${data.id}/edit`)
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteClick(resumeId: string, resumeTitle: string, e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    // 使用浏览器原生confirm对话框
    const confirmDelete = window.confirm(`确定要删除简历 "${resumeTitle}" 吗？\n\n此操作无法撤销，删除后所有相关数据将被永久删除。`)

    if (!confirmDelete) return

    setResumeToDelete(resumeId)
    setDeleting(true)

    try {
      const res = await authenticatedFetch(`/api/resumes/${resumeId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || '删除简历失败')
        return
      }

      // 从列表中移除已删除的简历
      setItems(prev => prev.filter(item => item.id !== resumeId))
      alert('简历删除成功！')
    } catch (error) {
      console.error('Delete error:', error)
      alert('删除简历时出错，请重试')
    } finally {
      setDeleting(false)
      setResumeToDelete(null)
    }
  }

  return (
    <>
      <div className="flex min-h-screen atelier-app-bg atelier-grid-bg">
        {/* Sidebar */}
        <aside className="w-64 bg-background/85 backdrop-blur-md border-r border-border/70 hidden md:flex flex-col">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 font-bold text-xl text-primary">
              <FileText className="h-6 w-6" />
              <span>ResumeCraft</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Button variant="secondary" className="w-full justify-start gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              History
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              Templates
            </Button>
          </nav>

          <div className="p-4 border-t space-y-2">
            <Link href="/profile">
              <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </Button>

            <div className="flex items-center gap-3 mt-4 p-2 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Avatar"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{profile?.display_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          <header className="h-16 atelier-topbar flex items-center justify-between px-6 sticky top-0 z-10">
            <h1 className="text-xl font-semibold">My Resumes</h1>
            <div className="flex items-center gap-4">
              <Button onClick={() => setChooserOpen(true)} disabled={creating}>
                <Plus className="h-4 w-4 mr-2" />
                {creating ? 'Creating...' : 'New Resume'}
              </Button>
            </div>
          </header>

          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resumes..."
                  className="pl-9 bg-background/90"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" className="gap-2">
                  <SortAsc className="h-4 w-4" />
                  Sort
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No resumes found</h3>
                <p className="text-muted-foreground mb-6">Create your first resume to get started.</p>
                <Button onClick={() => setChooserOpen(true)}>Create Resume</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => (
                  <Card key={item.id} className="group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 border-border/70 bg-background/85 backdrop-blur">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-2">
                          <FileText className="h-6 w-6" />
                        </div>
                      </div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">Updated {item.updated_text}</p>
                    </CardHeader>
                    <CardFooter className="pt-2 border-t bg-muted/5 flex justify-between items-center px-4 py-3">
                      <div className="flex gap-1">
                        <Link href={`/resume/${item.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" title="Edit">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/resume/${item.id}/export-share`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                      <div className="flex gap-1">
                        <Link href={`/resume/${item.id}/analysis`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" title="AI Analysis">
                            <Sparkles className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/resume/${item.id}/jd-match`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100/70" title="JD Match">
                            <Target className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Resume"
                          onClick={(e) => handleDeleteClick(item.id, item.title, e)}
                          disabled={deleting && resumeToDelete === item.id}
                        >
                          {deleting && resumeToDelete === item.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Template Chooser Modal */}
        {chooserOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto shadow-2xl border-border/70">
              <CardHeader className="border-b sticky top-0 bg-background z-10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Choose a Template</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Select a design to start your resume</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setChooserOpen(false)}>
                  <LogOut className="h-5 w-5 rotate-45" />
                </Button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { id: 'Modern', name: 'Modern', desc: 'Clean and professional, perfect for tech.', color: '#2b8cee' },
                    { id: 'Classic', name: 'Classic', desc: 'Traditional and elegant, for corporate roles.', color: '#0d141b' },
                    { id: 'Creative', name: 'Creative', desc: 'Bold and unique, for creative fields.', color: '#F5A623' }
                  ].map((t) => (
                    <div
                      key={t.id}
                      className="group cursor-pointer rounded-xl border hover:border-primary hover:shadow-lg transition-all overflow-hidden"
                      onClick={() => handleCreate(t.id, t.color, t.name)}
                    >
                      <div
                        className="h-40 w-full bg-muted relative"
                        style={{ background: `linear-gradient(135deg, ${t.color}20 0%, ${t.color}10 100%)` }}
                      >
                        <div className="absolute inset-4 bg-white shadow-sm rounded border opacity-80 group-hover:scale-105 transition-transform duration-300 flex flex-col p-2 gap-2">
                          <div className="h-2 w-1/3 rounded-full" style={{ background: t.color }}></div>
                          <div className="h-1 w-3/4 bg-muted rounded-full"></div>
                          <div className="h-1 w-1/2 bg-muted rounded-full"></div>
                          <div className="mt-2 space-y-1">
                            <div className="h-1 w-full bg-muted/50 rounded-full"></div>
                            <div className="h-1 w-full bg-muted/50 rounded-full"></div>
                            <div className="h-1 w-full bg-muted/50 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold">{t.name}</h3>
                        <p className="text-sm text-muted-foreground">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  )
}
