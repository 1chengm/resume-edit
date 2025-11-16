"use client"
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

export default function DashboardPage() {
  const router = useRouter()
  const [items, setItems] = useState<Array<{ id: string; title: string; updated_at: string; template: string; color_theme: string; updated_text?: string }>>([])
  const [query, setQuery] = useState('')
  const [chooserOpen, setChooserOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const missingConfig = !url || !key

  useEffect(() => {
    if (missingConfig) return
    const supabase = getSupabaseClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }
      const { data } = await supabase.from('resumes').select('id,title,updated_at,template,color_theme').order('updated_at', { ascending: false })
      const now = Date.now()
      const mapped = (data || []).map(d => {
        const dt = new Date(d.updated_at)
        const diff = Math.max(0, now - dt.getTime())
        const days = Math.floor(diff / (24 * 3600 * 1000))
        let txt = ''
        if (days >= 7) txt = `更新于 ${Math.floor(days / 7)} 周前`
        else if (days >= 1) txt = `更新于 ${days} 天前`
        else {
          const hours = Math.floor(diff / (3600 * 1000))
          if (hours >= 1) txt = `更新于 ${hours} 小时前`
          else {
            const mins = Math.floor(diff / (60 * 1000))
            txt = `更新于 ${mins} 分钟前`
          }
        }
        return { ...d, updated_text: txt }
      })
      setItems(mapped)
    })()
  }, [missingConfig, url, key, router])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(it => it.title.toLowerCase().includes(q))
  }, [items, query])

  function formatUpdatedText(txt?: string, fallback?: string) {
    return txt || fallback || ''
  }

  if (missingConfig) return (
    <main className="p-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">我的简历</h1>
      <p className="text-gray-500 mt-2">缺少 Supabase 配置</p>
    </main>
  )

  return (
    <>
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="flex h-full min-h-screen">
        <aside className="flex w-64 flex-col border-r border-[#EAEAEA] bg-white p-4">
          <div className="flex h-full min-h-[700px] flex-col justify-between">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 px-3">
                <span className="material-symbols-outlined text-primary text-3xl">article</span>
                <h1 className="text-xl font-bold">简历助手</h1>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 rounded-lg bg-primary/20 px-3 py-2 text-primary">
                  <span className="material-symbols-outlined">dashboard</span>
                  <p className="text-sm font-semibold">仪表盘</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 text-[#AAB8C2] hover:text-[#2C3E50] cursor-pointer">
                  <span className="material-symbols-outlined">work_history</span>
                  <p className="text-sm font-medium">投递追踪</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 text-[#AAB8C2] hover:text-[#2C3E50] cursor-pointer">
                  <span className="material-symbols-outlined">feed</span>
                  <p className="text-sm font-medium">模板库</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 px-3 py-2 text-[#AAB8C2] hover:text-[#2C3E50] cursor-pointer">
                  <span className="material-symbols-outlined">account_circle</span>
                  <p className="text-sm font-medium">账号设置</p>
                </div>
                <div className="flex items-center gap-3 px-3 py-2 text-[#AAB8C2] hover:text-[#2C3E50] cursor-pointer">
                  <span className="material-symbols-outlined">help</span>
                  <p className="text-sm font-medium">帮助中心</p>
                </div>
              </div>
              <div className="border-t border-[#EAEAEA] pt-4">
                <a href="/profile" className="flex gap-3">
                  <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDpyfmYUTzn8XOHsr_t_173DsAAeMwAd6f2OomhVfHg4SPduu6DNreTVkamlbAKLIZMTmNgiqWla-gkkkWqdvpG6HGLcMhvWrBWQxhoVXKyr1V60xMA1_E4csa7CGV8VCpXIFVoMoyFeYIMB_6jqHb7eyxF3LBrthfrO8i0at_H41ngVFwXCiKGtZ0KuB-6snleIU8wBFUkxu338U-IVHeJ1FzEUp6RgbIryCXNf0xeNdbYPzh5pKfiyC5DP53n7AA_ddlk4O2tWF8)'}}></div>
                  <div className="flex flex-col">
                    <h1 className="text-sm font-semibold">Alex Doe</h1>
                    <p className="text-xs text-[#AAB8C2]">alex.doe@email.com</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </aside>
        <main className="flex-1 p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-3xl font-black tracking-tight">我的简历</p>
              <button className="flex min-w-[84px] items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary/90" onClick={() => setChooserOpen(true)} disabled={creating}>
                <span className="material-symbols-outlined !text-lg">add_circle</span>
                <span className="truncate">{creating ? '创建中...' : '新建简历'}</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex-grow max-w-md">
                <label className="flex flex-col min-w-40 h-10 w-full">
                  <div className="flex w-full items-stretch rounded-lg h-full">
                    <div className="flex items-center justify-center pl-3 pr-2 bg-white rounded-l-lg border border-[#EAEAEA]">
                      <span className="material-symbols-outlined !text-2xl">search</span>
                    </div>
                    <input className="form-input flex w-full min-w-0 flex-1 rounded-lg text-sm placeholder:text-[#AAB8C2] focus:outline-0 focus:ring-2 focus:ring-primary/50 border h-full px-2 rounded-l-none border-l-0 bg-white border-[#EAEAEA]" placeholder="按标题搜索简历" value={query} onChange={e=>setQuery(e.target.value)} />
                  </div>
                </label>
              </div>
              <div className="flex gap-2">
                <details className="relative">
                  <summary className="flex h-10 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-white px-3 text-sm font-medium border border-[#EAEAEA] list-none">
                    <p>排序：更新时间</p>
                    <span className="material-symbols-outlined">arrow_drop_down</span>
                  </summary>
                  <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-[#EAEAEA] bg-white shadow-sm">
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">更新时间</button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">标题</button>
                  </div>
                </details>
                <details className="relative">
                  <summary className="flex h-10 cursor-pointer items-center justify-center gap-x-2 rounded-lg bg-white px-3 text-sm font-medium border border-[#EAEAEA] list-none">
                    <p>筛选：全部</p>
                    <span className="material-symbols-outlined">arrow_drop_down</span>
                  </summary>
                  <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-[#EAEAEA] bg-white shadow-sm">
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">全部</button>
                    <button className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50">近期更新</button>
                  </div>
                </details>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((it) => (
                <div key={it.id} className="flex flex-col justify-between gap-4 rounded-xl bg-white p-5 shadow-sm border border-[#EAEAEA]">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-[#AAB8C2]">{formatUpdatedText(it.updated_text, new Date(it.updated_at).toLocaleDateString())}</p>
                    <p className="text-lg font-bold">{it.title}</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#EAEAEA] pt-4">
                    <div className="flex items-center gap-1">
                      <a className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/20 text-[#AAB8C2] hover:text-primary" href={`/resume/${it.id}/edit`} title="Edit"><span className="material-symbols-outlined">edit</span></a>
                      <a className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/20 text-[#AAB8C2] hover:text-primary" href={`/resume/${it.id}/export-share`} title="Preview"><span className="material-symbols-outlined">visibility</span></a>
                      <a className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#50E3C2]/20 text-[#50E3C2]" href={`/resume/${it.id}/analysis`} title="AI Analyze"><span className="material-symbols-outlined">auto_awesome</span></a>
                      <a className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F5A623]/20 text-[#F5A623]" href={`/resume/${it.id}/jd-match`} title="JD Match"><span className="material-symbols-outlined">target</span></a>
                    </div>
                    <a className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-primary/20 text-[#AAB8C2] hover:text-primary" href={`/resume/${it.id}/export-share`} title="More Options"><span className="material-symbols-outlined">more_horiz</span></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
    {chooserOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-3xl rounded-xl bg-white shadow-lg border border-[#EAEAEA]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAEAEA]">
            <p className="text-lg font-bold">选择模板</p>
            <button className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center" onClick={() => setChooserOpen(false)}><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100">基础版</span>
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100">专业版</span>
                <span className="px-3 py-1 rounded-full text-sm bg-gray-100">创意版</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[{ id: 'Modern', name: '现代·基础', desc: '简洁清晰，适合技术岗位', color: '#2b8cee' }, { id: 'Classic', name: '经典·专业', desc: '稳重规范，适合管理岗位', color: '#0d141b' }, { id: 'Creative', name: '创意·亮色', desc: '视觉突出，适合设计岗位', color: '#F5A623' }].map(t => (
                <button key={t.id} className="text-left rounded-xl border border-[#EAEAEA] bg-white hover:bg-gray-50 p-4" onClick={async () => {
                  setCreating(true)
                  try {
                    const res = await authenticatedFetch('/api/resumes', { method: 'POST', body: JSON.stringify({ template: t.id, color_theme: t.color, title: `${t.name} 简历` }) })
                    const data = await res.json()
                    if (!res.ok || !data?.id) { alert(data.error || '创建失败'); setCreating(false); return }
                    setChooserOpen(false)
                    router.push(`/resume/${data.id}/edit`)
                  } finally { setCreating(false) }
                }}>
                  <div className="h-28 rounded-lg border border-[#EAEAEA] mb-3" style={{ background: `linear-gradient(90deg, ${t.color} 0%, ${t.color} 12px, #fff 12px)` }}></div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-[#AAB8C2]">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}