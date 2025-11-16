'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

type Profile = { display_name?: string; avatar_url?: string }

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile>({})
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [uploading, setUploading] = useState(false)

  function validateName(v: string) {
    const val = v.trim()
    if (val.length < 2 || val.length > 32) return '长度需在2-32字符'
    if (!/^[\p{L}0-9 _.-]+$/u.test(val)) return '仅允许字母、数字、空格、._-'
    return ''
  }

  async function saveName() {
    const err = validateName(nameInput)
    setNameError(err)
    if (err) return
    const res = await authenticatedFetch('/api/profile', { method: 'POST', body: JSON.stringify({ display_name: nameInput }) })
    if (res.ok) setProfile(prev => ({ ...prev, display_name: nameInput }))
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) { alert('仅支持 JPG/PNG'); return }
    if (file.size > 2 * 1024 * 1024) { alert('图片大小不超过 2MB'); return }
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    await new Promise(r => { img.onload = () => r(null) })
    const size = Math.min(img.naturalWidth, img.naturalHeight)
    const sx = Math.floor((img.naturalWidth - size) / 2)
    const sy = Math.floor((img.naturalHeight - size) / 2)
    const canvas = document.createElement('canvas')
    canvas.width = size; canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
    const blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), file.type))
    const fd = new FormData(); fd.append('file', blob, 'avatar.' + (file.type.includes('png') ? 'png' : 'jpg'))
    setUploading(true)
    const res = await authenticatedFetch('/api/profile/avatar', { method: 'POST', body: fd })
    const j = await res.json()
    setUploading(false)
    if (res.ok) setProfile(prev => ({ ...prev, avatar_url: j.avatar_url }))
    else alert(j.error || '上传失败')
  }

  useEffect(() => {
    const supabase = getSupabaseClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }
      setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('display_name,avatar_url').eq('user_id', user.id).single()
      setProfile(data || {})
      setNameInput((data?.display_name as string) || '')
      setLoading(false)
    })()
  }, [router])

  if (loading) return (<main className="p-8"><p>加载中...</p></main>)

  const avatar = profile.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpyfmYUTzn8XOHsr_t_173DsAAeMwAd6f2OomhVfHg4SPduu6DNreTVkamlbAKLIZMTmNgiqWla-gkkkWqdvpG6HGLcMhvWrBWQxhoVXKyr1V60xMA1_E4csa7CGV8VCpXIFVoMoyFeYIMB_6jqHb7eyxF3LBrthfrO8i0at_H41ngVFwXCiKGtZ0KuB-6snleIU8wBFUkxu338U-IVHeJ1FzEUp6RgbIryCXNf0xeNdbYPzh5pKfiyC5DP53n7AA_ddlk4O2tWF8)'

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <div className="flex h-full flex-1">
        <aside className="flex w-64 flex-col gap-8 border-r border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: `url(${avatar})` }}></div>
              <div className="flex flex-col">
                <h1 className="text-base font-medium">{profile.display_name || '未设置'}</h1>
                <p className="text-sm text-slate-500">{email || '未知'}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary" href="#">
                <span className="material-symbols-outlined">person</span>
                <p className="text-sm font-medium">个人信息</p>
              </a>
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100" href="#">
                <span className="material-symbols-outlined">shield</span>
                <p className="text-sm font-medium">隐私与数据</p>
              </a>
              <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100" href="#">
                <span className="material-symbols-outlined">credit_card</span>
                <p className="text-sm font-medium">订阅</p>
              </a>
            </div>
          </div>
          <div className="mt-auto flex flex-col gap-1">
            <a className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100" href="#">
              <span className="material-symbols-outlined">logout</span>
              <p className="text-sm font-medium">退出登录</p>
            </a>
          </div>
        </aside>
        <main className="flex-1 p-6 sm:p-8 md:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <div className="flex items-center gap-4">
                <a className="flex items-center justify-center size-10 rounded-lg bg-white border border-slate-200 hover:bg-slate-100" href="/dashboard">
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                </a>
                <div>
                  <h1 className="text-3xl font-black">账户设置</h1>
                  <p className="text-slate-500 mt-1">管理个人信息与隐私设置</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-bold">个人信息</h2>
                <p className="text-sm text-slate-500 mt-1">个人信息编辑将很快在统一仪表盘提供</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium pb-2">显示名称</p>
                    <div className="flex gap-2">
                      <input className="w-full rounded-lg border border-slate-200 bg-[#f6f7f8] h-12 px-4 text-base" value={nameInput} onChange={(e)=>{ setNameInput(e.target.value); setNameError(validateName(e.target.value)) }} />
                      <button className="px-4 rounded-lg bg-primary text-white font-semibold" onClick={saveName}>保存</button>
                    </div>
                    {nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
                  </div>
                  <div>
                    <p className="text-sm font-medium pb-2">邮箱地址</p>
                    <p className="w-full rounded-lg border border-slate-200 bg-[#f6f7f8] h-12 px-4 flex items-center text-base">{email || '未知'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-6">
                <h2 className="text-lg font-bold">隐私与数据</h2>
              </div>
              <div className="p-6 space-y-6 divide-y divide-slate-200">
                <div className="space-y-4 pt-0">
                  <h3 className="font-semibold text-base">头像</h3>
                  <div className="flex items-center gap-3">
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-20" style={{ backgroundImage: `url(${avatar})` }}></div>
                    <div className="flex flex-col gap-2">
                      <input type="file" accept="image/png, image/jpeg" onChange={onFileChange} />
                      {uploading && <p className="text-sm text-slate-500">上传中...</p>}
                    </div>
                  </div>
                </div>
                <div className="space-y-4 pt-0">
                  <h3 className="font-semibold text-base">隐私设置</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">允许 AI 分析我的简历</p>
                      <p className="text-sm text-slate-500">获得个性化优化建议</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input className="sr-only peer" type="checkbox" defaultChecked />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">为未来功能存储简历数据</p>
                      <p className="text-sm text-slate-500">允许使用匿名化数据改进服务</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input className="sr-only peer" type="checkbox" />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>
                <div className="pt-6">
                  <h3 className="font-semibold text-base text-red-600">管理你的数据</h3>
                  <p className="text-sm text-slate-500 mt-1">删除账户与所有数据，此操作不可恢复</p>
                  <div className="flex justify-start mt-4">
                    <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-600/90" type="button">删除账户</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}