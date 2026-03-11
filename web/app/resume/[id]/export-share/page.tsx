import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ExportShareClient from './client'

async function ExportShareContent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/sign-in')
  }

  return <ExportShareClient />
}

export default function ExportSharePage() {
  return (
    <Suspense fallback={<div className="atelier-loading">Loading...</div>}>
      <ExportShareContent />
    </Suspense>
  )
}
