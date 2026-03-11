import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalysisClient from "./client"

async function ResumeAnalysisContent({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/sign-in')
  }

  const { id } = await params

  return (
    <Suspense fallback={
      <div className="atelier-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载分析页面...</p>
        </div>
      </div>
    }>
      <AnalysisClient resumeId={id} />
    </Suspense>
  )
}

export default function ResumeAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={
      <div className="atelier-loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">正在加载分析页面...</p>
        </div>
      </div>
    }>
      <ResumeAnalysisContent params={params} />
    </Suspense>
  )
}

