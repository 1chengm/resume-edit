import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JDMatchClient from './client'

async function JDMatchContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return <JDMatchClient />
}

export default function JDMatchPage() {
  return (
    <Suspense fallback={<div className="atelier-loading">Loading...</div>}>
      <JDMatchContent />
    </Suspense>
  )
}
