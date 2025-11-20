"use client"
import Link from "next/link"
import { useMemo, useRef, useState, useEffect } from "react"
import type { ResumeContent } from "@/types/resume"
import { authenticatedFetch } from "@/lib/authenticatedFetch"

type ScoreItem = { name: string; score: number }
type Suggestion = { description: string; before: string; after: string }
type AnalysisData = {
  overallScore: number
  scoreBreakdown: ScoreItem[]
  detailedAnalysis?: { content: Array<{ title: string; suggestions: Suggestion[] }> }
  contentRecommendations?: { missing_sections: string[]; recommendations: string[] }
  structureRecommendations?: string[]
  expressionExamples?: string[]
}

export default function AnalysisClient({ 
  resumeId 
}: { 
  resumeId: string 
}) {
  const [resume, setResume] = useState<{ id: string; title: string } | null>(null)
  const [resumeContent, setResumeContent] = useState<ResumeContent | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [activeTab, setActiveTab] = useState<"content" | "structure" | "language">("content")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null })
  const sectionRef = useRef<HTMLDivElement | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch profile data first
        const profileRes = await authenticatedFetch('/api/profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile({
            display_name: profileData.display_name,
            avatar_url: profileData.avatar_url
          })
        }
        
        // Fetch resume data
        const resumeRes = await authenticatedFetch(`/api/resumes/${resumeId}`)
        
        if (resumeRes.status === 401) {
          // Handle authentication error specifically
          setError('请先登录以查看简历分析')
          setLoading(false)
          return
        }
        
        if (!resumeRes.ok) {
          throw new Error(`Failed to fetch resume data: ${resumeRes.status}`)
        }
        
        const resumeData = await resumeRes.json()
        
        if (!resumeData) {
          throw new Error('No resume data found')
        }
        
        setResume({ id: resumeData.id, title: resumeData.title })
        setResumeContent(resumeData.content_json || null)

        // For initial analysis, use default data or fetch from API
        const defaultAnalysis: AnalysisData = {
          overallScore: 75,
          scoreBreakdown: [
            { name: "内容完整度", score: 70 },
            { name: "结构与排版", score: 80 },
            { name: "语言与表达", score: 75 }
          ]
        }
        setAnalysis(defaultAnalysis)
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data'
        setError(errorMessage)
        console.error('Data fetching error:', err)
      } finally {
        setLoading(false)
      }
    }

    if (resumeId) {
      fetchData()
    }
  }, [resumeId])

  const scoreState = useMemo(() => {
    return (score: number) => {
      if (score >= 85) return { label: "优秀", text: "text-success", bar: "bg-success", stroke: "text-success" }
      if (score >= 70) return { label: "良好", text: "text-warning", bar: "bg-warning", stroke: "text-warning" }
      return { label: "较弱", text: "text-danger", bar: "bg-danger", stroke: "text-danger" }
    }
  }, [])

  async function downloadPDF() {
    const el = sectionRef.current
    if (!el || !resume?.id) return

    try {
      const reportHtml = el.outerHTML;
      
      // We need to wrap the report section in a full HTML document with styles
      // to ensure it renders correctly in the headless browser.
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Analysis Report</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
          <style>
            .material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
            body { background-color: #f6f7f8; }
          </style>
        </head>
        <body class="p-8">
          ${reportHtml}
        </body>
        </html>
      `;

      const res = await fetch("/api/export-html-as-pdf", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: fullHtml }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "analysis-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      await authenticatedFetch("/api/stats", { method: "POST", body: JSON.stringify({ type: "pdf_download", resume_id: resume.id }) })
    } catch (error) {
      console.error("PDF download failed:", error)
      alert("Failed to download PDF report.")
    }
  }

  async function reAnalyze() {
    if (!resumeContent || !resume?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await authenticatedFetch("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ resumeContent, resumeId: resume.id })
      })
      const data = await res.json()
      if (!res.ok) { 
        setError(data.error || '分析失败，请稍后再试')
        setLoading(false) 
        return 
      }
      const mapped: AnalysisData = {
        overallScore: data.overall_score || 0,
        scoreBreakdown: [
          { name: "内容完整度", score: data.scores?.content_completeness || 0 },
          { name: "结构与排版", score: data.scores?.structure || 0 },
          { name: "语言与表达", score: data.scores?.expression || 0 }
        ],
        contentRecommendations: { missing_sections: data.content_completeness?.missing_sections || [], recommendations: data.content_completeness?.recommendations || [] },
        structureRecommendations: data.structure?.recommendations || [],
        expressionExamples: data.expression?.rewrite_examples || []
      }
      setAnalysis(mapped)
    } catch (err) {
      setError('网络错误，请检查连接后重试')
      console.error('Re-analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载分析数据...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isAuthError = error.includes('登录') || error.includes('authentication')
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">加载失败</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            {isAuthError ? (
              <>
                <Link href="/login" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                  去登录
                </Link>
                <Link href="/dashboard" className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600">
                  返回仪表盘
                </Link>
              </>
            ) : (
              <>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  重新加载
                </button>
                <Link href="/dashboard" className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600">
                  返回仪表盘
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!resume || !analysis) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">数据加载失败</h1>
          <p className="text-gray-600 mb-4">无法加载简历数据，请返回重试。</p>
          <Link href="/dashboard" className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
            返回仪表盘
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        </div>
      )}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-neutral-200 dark:border-neutral-800/50 px-6 md:px-10 py-3 bg-white dark:bg-background-dark shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4 text-neutral-800 dark:text-neutral-100">
          {/* Back button */}
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
            title="返回仪表盘"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div className="size-6 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_543)">
                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                <path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.8261C3.33925 25.0549 3.78663 23.9618 4.41187 22.9688L18.7597 8.62099C20.1473 7.23339 22.1235 7.23197 23.7139 7.57404C25.3919 7.93481 27.2666 8.79049 29.1604 10.2297C31.5022 11.9872 34.012 13.9835 36.4142 16.3858C38.8165 18.788 40.8128 21.2978 42.252 23.6396C43.4158 25.5334 44.2714 27.4081 44.6322 29.0861C44.9743 30.6765 44.9757 32.6527 43.5881 34.0403L29.2403 48.3881C28.1187 49.5097 26.5973 49.7179 25.8261 49.5893C25.0549 49.4607 23.9618 49.0134 22.9688 48.3881L8.62099 34.0403C7.23339 32.6527 7.23197 30.6765 7.57404 29.0861C7.93481 27.4081 8.79049 25.5334 10.2297 23.6396C11.9872 21.2978 13.9835 18.788 16.3858 16.3858C18.788 13.9835 21.2978 11.9872 23.6396 10.2297C25.5334 8.79049 27.4081 7.93481 29.0861 7.57404C30.6765 7.23197 32.6527 7.23339 34.0403 8.62099L48.3881 22.9688C49.5097 24.0904 49.7179 25.6118 49.5893 26.383C49.4607 27.1542 49.0134 28.2473 48.3881 29.2403L34.0403 43.5881C32.6527 44.9757 30.6765 44.9743 29.0861 44.6322C27.4081 44.2714 25.5334 43.4158 23.6396 42.252C21.2978 40.8128 18.788 38.8165 16.3858 36.4142C13.9835 34.012 11.9872 31.5022 10.2297 29.1604C8.79049 27.2666 7.93481 25.3919 7.57404 23.7139C7.23197 22.1235 7.23339 20.1473 8.62099 18.7597L29.2403 4.41187C30.3619 3.29027 31.8833 3.08209 32.6545 3.21067C33.4257 3.33925 34.5188 3.78663 35.5118 4.41187L29.2403 4.41187Z" fill="currentColor"></path>
              </g>
            </svg>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">ResumeAI</h2>
        </div>
        <div className="flex flex-1 justify-end items-center gap-8">
          <div className="hidden lg:flex items-center gap-9">
            <Link className="text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary" href="/dashboard">仪表盘</Link>
            <Link className="text-sm font-medium leading-normal text-primary dark:text-primary" href="/dashboard">我的简历</Link>
            <Link className="text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary" href="/profile">个人中心</Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit resume button */}
            <Link 
              href={`/resume/${resumeId}/edit`}
              className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-colors"
              title="编辑简历"
            >
              <span className="material-symbols-outlined">edit_document</span>
            </Link>
            {/* Profile avatar - using profile data */}
            <Link 
              href="/profile" 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex items-center justify-center overflow-hidden"
              title="个人中心"
            >
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="头像" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="material-symbols-outlined text-neutral-600 dark:text-neutral-300">person</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center py-8 px-6 md:px-10 lg:px-12">
          <div className="layout-content-container flex flex-col w-full max-w-7xl">
            <div className="flex flex-wrap justify-between gap-4 p-4 items-center">
              <div className="flex min-w-72 flex-col gap-2">
                <p className="text-3xl font-black leading-tight tracking-[-0.033em]">简历分析 - {resume?.title || '未知简历'}</p>
                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">以下是简历表现与 AI 优化建议。</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadPDF} 
                  disabled={!resumeContent}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-white dark:bg-background-dark border border-neutral-200 dark:border-neutral-800/50 text-neutral-800 dark:text-neutral-100 text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!resumeContent ? "简历内容为空，无法生成报告" : "下载分析报告"}
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  <span className="truncate">下载报告</span>
                </button>
                <button 
                  disabled={!resumeContent || loading} 
                  onClick={reAnalyze} 
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary/20 dark:bg-primary/30 text-primary text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-primary/30 dark:hover:bg-primary/40 disabled:opacity-60"
                  title={!resumeContent ? "简历内容为空，无法重新分析" : loading ? "正在分析中..." : "重新分析简历"}
                >
                  <span className="material-symbols-outlined text-lg">{loading ? "hourglass_empty" : "autorenew"}</span>
                  <span className="truncate">{loading ? "分析中..." : "重新分析"}</span>
                </button>
              </div>
            </div>

            <div ref={sectionRef} className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8" id="analysis-section">
              <aside className="lg:col-span-1 flex flex-col gap-6">
                <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-neutral-200 dark:border-neutral-800/50 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">总体评分</h3>
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative size-40">
                      <svg className="size-full" height="36" viewBox="0 0 36 36" width="36" xmlns="http://www.w3.org/2000/svg">
                        <circle className="stroke-current text-neutral-200 dark:text-neutral-800/50" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                        <circle className={`stroke-current ${scoreState(analysis.overallScore).stroke}`} cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - analysis.overallScore} strokeLinecap="round" strokeWidth="3" transform="rotate(-90 18 18)"></circle>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-black">{analysis.overallScore}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/ 100</span>
                      </div>
                    </div>
                    <p className={`text-xl font-bold ${scoreState(analysis.overallScore).text}`}>{scoreState(analysis.overallScore).label}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-background-dark p-6 rounded-xl border border-neutral-200 dark:border-neutral-800/50 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">评分拆解</h3>
                  <div className="flex flex-col gap-5">
                    {(analysis.scoreBreakdown || []).map((item) => (
                      <div key={item.name} className="flex items-center gap-4">
                        <div className="text-neutral-800 dark:text-neutral-100 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800/50 shrink-0 size-12">
                          <span className="material-symbols-outlined">bar_chart</span>
                        </div>
                        <div className="flex flex-col justify-center flex-1">
                          <p className="text-base font-medium leading-normal">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800/50">
                              <div className={`h-1.5 rounded-full ${scoreState(item.score).bar}`} style={{ width: `${item.score}%` }}></div>
                            </div>
                          </div>
                        </div>
                        <p className="text-base font-bold leading-normal">{item.score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              <section className="lg:col-span-2 flex flex-col bg-white dark:bg-background-dark p-6 rounded-xl border border-neutral-200 dark:border-neutral-800/50 shadow-sm">
                <div className="flex border-b border-neutral-200 dark:border-neutral-800/50 mb-6">
                  <button onClick={() => setActiveTab("content")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 ${activeTab === "content" ? "border-primary text-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-neutral-100"}`}>内容</button>
                  <button onClick={() => setActiveTab("structure")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 ${activeTab === "structure" ? "border-primary text-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-neutral-100"}`}>结构</button>
                  <button onClick={() => setActiveTab("language")} className={`px-4 py-2.5 text-sm font-semibold border-b-2 ${activeTab === "language" ? "border-primary text-primary" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-neutral-100"}`}>语言</button>
                </div>

                {activeTab === "content" && (
                  <div className="flex flex-col gap-4">
                    {analysis.detailedAnalysis?.content?.map((item, i) => (
                      <details key={item.title} className="group rounded-lg bg-neutral-100/60 dark:bg-neutral-800/30" open={i === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3">
                            <span className={`material-symbols-outlined ${i === 0 ? "text-warning" : "text-danger"}`}>{i === 0 ? "warning" : "error"}</span>
                            <span>{item.title}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${i === 0 ? "bg-warning/20 text-warning" : "bg-danger/20 text-danger"}`}>{item.suggestions.length} 项建议</span>
                          </div>
                          <span className="transition group-open:rotate-180"><span className="material-symbols-outlined">expand_more</span></span>
                        </summary>
                        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/50 flex flex-col gap-4">
                          {item.suggestions.map((s, j) => (
                            <div key={j} className="bg-white dark:bg-background-dark rounded-lg p-4 border border-neutral-200 dark:border-neutral-800/50">
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{s.description}</p>
                              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md text-sm mb-2"><span className="line-through text-red-700 dark:text-red-400">&quot;{s.before}&quot;</span></div>
                              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md text-sm"><span className="text-green-700 dark:text-green-400">&quot;{s.after}&quot;</span></div>
                              <div className="flex justify-end gap-2 mt-4">
                                <button className="px-3 py-1.5 text-xs font-bold rounded-md bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800/80" onClick={() => {}}>忽略</button>
                                <button className="px-3 py-1.5 text-xs font-bold rounded-md bg-success text-white hover:bg-success/90" onClick={() => {}}>应用建议</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}

                    {analysis.contentRecommendations && (
                      <div className="rounded-lg bg-neutral-100/60 dark:bg-neutral-800/30">
                        <div className="p-4 font-medium">
                          <div className="flex items-center gap-3 mb-2"><span className="material-symbols-outlined text-danger">error</span><span>内容建议</span></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-neutral-200 dark:border-neutral-800/50">
                              <p className="text-sm font-semibold mb-2">缺失模块</p>
                              <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc ml-5">
                                {(analysis.contentRecommendations.missing_sections || []).map((m, idx) => (<li key={idx}>{m}</li>))}
                              </ul>
                            </div>
                            <div className="bg-white dark:bg-background-dark rounded-lg p-4 border border-neutral-200 dark:border-neutral-800/50">
                              <p className="text-sm font-semibold mb-2">优化建议</p>
                              <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc ml-5">
                                {(analysis.contentRecommendations.recommendations || []).map((m, idx) => (<li key={idx}>{m}</li>))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "structure" && (
                  <div className="flex flex-col gap-4">
                    {(analysis.structureRecommendations || []).map((rec, idx) => (
                      <div key={idx} className="group rounded-lg bg-neutral-100/60 dark:bg-neutral-800/30">
                        <div className="flex items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-warning">warning</span><span>{rec}</span></div>
                        </div>
                      </div>
                    ))}
                    {(analysis.structureRecommendations || []).length === 0 && (
                      <div className="group rounded-lg bg-neutral-100/60 dark:bg-neutral-800/30">
                        <div className="flex items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-success">check_circle</span><span>结构合理</span></div>
                          <span className="text-sm font-semibold text-success">未发现问题</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "language" && (
                  <div className="flex flex-col gap-4">
                    {(analysis.expressionExamples || []).map((ex, idx) => (
                      <div key={idx} className="bg-white dark:bg-background-dark rounded-lg p-4 border border-neutral-200 dark:border-neutral-800/50">
                        <p className="text-sm text-gray-600 dark:text-gray-300">{ex}</p>
                      </div>
                    ))}
                    {(analysis.expressionExamples || []).length === 0 && (
                      <div className="group rounded-lg bg-neutral-100/60 dark:bg-neutral-800/30">
                        <div className="flex items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3"><span className="material-symbols-outlined text-success">check_circle</span><span>表达清晰</span></div>
                          <span className="text-sm font-semibold text-success">未发现问题</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}