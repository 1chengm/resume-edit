'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/src/lib/authenticatedFetch'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  User,
  Shield,
  CreditCard,
  LogOut,
  ArrowLeft,
  Loader2,
  Camera,
  Trash2
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Profile = { display_name?: string; avatar_url?: string }

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile>({})
  const [nameInput, setNameInput] = useState('')
  const [nameError, setNameError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  function validateName(v: string) {
    const val = v.trim()
    if (val.length < 2 || val.length > 32) return 'Length must be between 2-32 characters'
    if (!/^[\p{L}0-9 _.-]+$/u.test(val)) return 'Only letters, numbers, spaces, ._- allowed'
    return ''
  }

  async function saveName() {
    const err = validateName(nameInput)
    setNameError(err)
    if (err) return
    const res = await authenticatedFetch('/api/profile', { method: 'POST', body: JSON.stringify({ display_name: nameInput }) })
    if (res.ok) setProfile(prev => ({ ...prev, display_name: nameInput }))
  }

  async function handleSignOut() {
    setSigningOut(true)
    setSignOutError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.replace('/sign-in')
    } catch (err) {
      console.error('Sign out failed', err)
      setSignOutError('Sign out failed, please try again')
      setSigningOut(false)
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) { alert('Only JPG/PNG supported'); return }
    if (file.size > 2 * 1024 * 1024) { alert('Image size must be under 2MB'); return }

    setUploading(true)
    try {
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

      const res = await authenticatedFetch('/api/profile/avatar', { method: 'POST', body: fd })
      const j = await res.json()

      if (res.ok) setProfile(prev => ({ ...prev, avatar_url: j.avatar_url }))
      else alert(j.error || 'Upload failed')
    } catch (error) {
      console.error('Upload error:', error)
      alert('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    ; (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/sign-in'); return }
      setEmail(user.email || '')

      try {
        const response = await authenticatedFetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          setProfile(data)
          setNameInput(data.display_name || '')
        } else {
          setProfile({})
          setNameInput('')
        }
      } catch (error) {
        setProfile({})
        setNameInput('')
      }

      setLoading(false)
    })()
  }, [router])

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  const avatar = profile.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpyfmYUTzn8XOHsr_t_173DsAAeMwAd6f2OomhVfHg4SPduu6DNreTVkamlbAKLIZMTmNgiqWla-gkkkWqdvpG6HGLcMhvWrBWQxhoVXKyr1V60xMA1_E4csa7CGV8VCpXIFVoMoyFeYIMB_6jqHb7eyxF3LBrthfrO8i0at_H41ngVFwXCiKGtZ0KuB-6snleIU8wBFUkxu338U-IVHeJ1FzEUp6RgbIryCXNf0xeNdbYPzh5pKfiyC5DP53n7AA_ddlk4O2tWF8)'

  return (
    <div className="min-h-screen bg-muted/10 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-background border-r p-6 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-full overflow-hidden border bg-muted">
              <img src={avatar} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <h3 className="font-medium truncate">{profile.display_name || 'Not Set'}</h3>
              <p className="text-xs text-muted-foreground truncate">{email || 'Unknown'}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            <Button variant="secondary" className="justify-start gap-2 w-full">
              <User className="h-4 w-4" />
              Personal Info
            </Button>
            <Button variant="ghost" className="justify-start gap-2 w-full">
              <Shield className="h-4 w-4" />
              Privacy & Data
            </Button>
            <Button variant="ghost" className="justify-start gap-2 w-full">
              <CreditCard className="h-4 w-4" />
              Subscription
            </Button>
          </nav>
        </div>

        <div className="mt-auto space-y-2">
          <Button
            variant="ghost"
            className="justify-start gap-2 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
          {signOutError && <p className="text-xs text-destructive px-2">{signOutError}</p>}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
              <p className="text-muted-foreground">Manage your personal information and preferences</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your display name and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <div className="flex gap-2">
                    <Input
                      value={nameInput}
                      onChange={(e) => { setNameInput(e.target.value); setNameError(validateName(e.target.value)) }}
                      className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
                    />
                    <Button onClick={saveName}>Save</Button>
                  </div>
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <Input value={email || 'Unknown'} disabled className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
              <CardDescription>Manage your avatar and data privacy settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 divide-y">
              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 pt-2">
                <div className="space-y-1">
                  <h3 className="font-medium">Avatar</h3>
                  <p className="text-sm text-muted-foreground">Click to upload a new avatar.</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="relative h-24 w-24 rounded-full overflow-hidden border bg-muted group cursor-pointer">
                    <img src={avatar} alt="Avatar" className="h-full w-full object-cover transition-opacity group-hover:opacity-75" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      onChange={onFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Button variant="outline" className="relative" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Upload New Image
                      <input
                        type="file"
                        accept="image/png, image/jpeg"
                        onChange={onFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={uploading}
                      />
                    </Button>
                    <p className="text-xs text-muted-foreground">JPG or PNG. Max 2MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 pt-8">
                <div className="space-y-1">
                  <h3 className="font-medium">Privacy Settings</h3>
                  <p className="text-sm text-muted-foreground">Control how your data is used.</p>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">AI Analysis</h4>
                      <p className="text-sm text-muted-foreground">Allow AI to analyze your resume for personalized suggestions.</p>
                    </div>
                    <input type="checkbox" className="toggle" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">Data Improvement</h4>
                      <p className="text-sm text-muted-foreground">Allow use of anonymized data to improve our services.</p>
                    </div>
                    <input type="checkbox" className="toggle" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 pt-8">
                <div className="space-y-1">
                  <h3 className="font-medium text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground">Irreversible actions.</p>
                </div>
                <div>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete Account
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}