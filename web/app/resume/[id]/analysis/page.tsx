import { Suspense } from 'react'
import AnalysisClient from "./client"

export default async function ResumeAnalysisPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载分析页面...</p>
        </div>
      </div>
    }>
      <AnalysisClient resumeId={id} />
    </Suspense>
  )
}