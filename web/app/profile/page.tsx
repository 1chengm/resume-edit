import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from './client'

async function ProfileContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return <ProfileClient initialEmail={user.email ?? ''} />
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="atelier-loading">Loading...</div>}>
      <ProfileContent />
    </Suspense>
  )
}
