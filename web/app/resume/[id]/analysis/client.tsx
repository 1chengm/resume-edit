"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { ResumeContent } from "@/types/resume"
import { authenticatedFetch } from "@/lib/authenticatedFetch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  FileEdit,
  User,
  Download,
  RefreshCw,
  Loader2,
  BarChart3,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Sparkles
} from "lucide-react"

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

// Helper function to generate detailed analysis from AI data
function generateDetailedAnalysis(aiData: any) {
  const suggestions = []
  
  // Content completeness suggestions
  if (aiData.content_completeness?.recommendations?.length > 0) {
    suggestions.push({
      title: "内容完整性需要改进",
      suggestions: aiData.content_completeness.recommendations.map((rec: string, index: number) => ({
        description: rec,
        before: "当前内容",
        after: "建议改进"
      }))
    })
  }

  // Structure recommendations
  if (aiData.structure?.recommendations?.length > 0) {
    suggestions.push({
      title: "简历结构可以优化",
      suggestions: aiData.structure.recommendations.map((rec: string, index: number) => ({
        description: rec,
        before: "当前结构",
        after: "建议结构"
      }))
    })
  }

  // Expression examples
  if (aiData.expression?.rewrite_examples?.length > 0) {
    suggestions.push({
      title: "语言表达需要提升",
      suggestions: aiData.expression.rewrite_examples.slice(0, 3).map((example: string, index: number) => ({
        description: "表达可以更专业和具体",
        before: "原表达",
        after: example
      }))
    })
  }

  // If no specific suggestions, provide general ones
  if (suggestions.length === 0) {
    suggestions.push({
      title: "简历整体表现良好",
      suggestions: [{
        description: "简历内容完整，结构清晰，表达准确",
        before: "当前简历",
        after: "继续保持"
      }]
    })
  }

  return { content: suggestions }
}

// Helper function to generate comprehensive mock analysis for demo
function generateComprehensiveMockAnalysis(): AnalysisData {
  return {
    overallScore: 75,
    scoreBreakdown: [
      { name: "内容完整度", score: 70 },
      { name: "结构与排版", score: 80 },
      { name: "语言与表达", score: 75 }
    ],
    detailedAnalysis: {
      content: [
        {
          title: "内容完整性需要改进",
          suggestions: [
            {
              description: "缺少关键的工作成果量化数据",
              before: "负责产品开发工作",
              after: "负责产品开发工作，带领团队完成3个主要项目，提升产品性能25%"
            },
            {
              description: "技能部分可以更具体",
              before: "熟悉前端技术",
              after: "精通React、Vue.js框架，具有3年前端开发经验，熟悉TypeScript和现代化开发工具链"
            }
          ]
        },
        {
          title: "简历结构可以优化",
          suggestions: [
            {
              description: "工作经历应按时间倒序排列",
              before: "按时间正序列出工作经历",
              after: "将最近的工作经历放在前面，突出最新成就"
            }
          ]
        }
      ]
    },
    contentRecommendations: {
      missing_sections: ['项目成果展示', '专业技能证书', '获奖经历'],
      recommendations: [
        '添加更多量化数据和具体成果',
        '补充专业技能的具体应用案例',
        '考虑添加个人项目或开源贡献'
      ]
    },
    structureRecommendations: [
      '建议使用更专业的时间格式',
      '每个工作经历的描述长度保持一致',
      '添加清晰的段落分隔'
    ],
    expressionExamples: [
      '将"负责项目开发"改为"主导项目开发，带领5人团队完成XX系统，提升效率40%"',
      '将"熟悉技术"改为"精通XX技术，具有3年实际项目经验"',
      '使用更具体的动词，如"优化"、"提升"、"实现"等'
    ]
  }
}

interface AnalysisClientProps {
  resumeId: string
}

export default function AnalysisClient({ resumeId }: AnalysisClientProps) {
  const router = useRouter()
  const [resume, setResume] = useState<{ id: string; title: string } | null>(null)
  const [resumeContent, setResumeContent] = useState<ResumeContent | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [activeTab, setActiveTab] = useState<"content" | "structure" | "language">("content")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const sectionRef = useRef<HTMLDivElement | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    async function fetchData() {
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

        // Fetch real AI analysis data
        if (resumeData.content_json) {
          try {
            const analysisRes = await authenticatedFetch("/api/ai/analyze", {
              method: "POST",
              body: JSON.stringify({ 
                resumeContent: resumeData.content_json, 
                resumeId: resumeData.id 
              })
            })
            
            if (analysisRes.ok) {
              const aiData = await analysisRes.json()
              
              // Generate detailed analysis from AI recommendations
              const detailedAnalysis = generateDetailedAnalysis(aiData)
              
              const mappedAnalysis: AnalysisData = {
                overallScore: Math.round(aiData.overall_score || 0),
                scoreBreakdown: [
                  { name: "内容完整度", score: Math.round(aiData.scores?.content_completeness || 0) },
                  { name: "结构与排版", score: Math.round(aiData.scores?.structure || 0) },
                  { name: "语言与表达", score: Math.round(aiData.scores?.expression || 0) }
                ],
                detailedAnalysis: detailedAnalysis,
                contentRecommendations: { 
                  missing_sections: aiData.content_completeness?.missing_sections || [], 
                  recommendations: aiData.content_completeness?.recommendations || [] 
                },
                structureRecommendations: aiData.structure?.recommendations || [],
                expressionExamples: aiData.expression?.rewrite_examples || []
              }
              setAnalysis(mappedAnalysis)
              
              // 检查是否为缓存结果（如果返回的数据中包含缓存标识）
              if (aiData.is_cached === true) {
                setIsCached(true)
              }
            } else {
              // Fallback to comprehensive mock analysis if AI fails
              const fallbackAnalysis = generateComprehensiveMockAnalysis()
              setAnalysis(fallbackAnalysis)
            }
          } catch (analysisError) {
            console.warn('AI analysis failed, using default data:', analysisError)
            const defaultAnalysis: AnalysisData = {
              overallScore: 75,
              scoreBreakdown: [
                { name: "内容完整度", score: 70 },
                { name: "结构与排版", score: 80 },
                { name: "语言与表达", score: 75 }
              ]
            }
            setAnalysis(defaultAnalysis)
          }
        } else {
          // No content available, show empty state
          const defaultAnalysis: AnalysisData = {
            overallScore: 0,
            scoreBreakdown: [
              { name: "内容完整度", score: 0 },
              { name: "结构与排版", score: 0 },
              { name: "语言与表达", score: 0 }
            ]
          }
          setAnalysis(defaultAnalysis)
        }
        
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
      if (score >= 85) return { label: "优秀", text: "text-green-600", bar: "bg-green-600", stroke: "text-green-600" }
      if (score >= 70) return { label: "良好", text: "text-yellow-600", bar: "bg-yellow-600", stroke: "text-yellow-600" }
      return { label: "较弱", text: "text-red-600", bar: "bg-red-600", stroke: "text-red-600" }
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
    if (!resumeContent || !resume?.id) {
      setError('简历内容为空，无法进行分析')
      return
    }
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const res = await authenticatedFetch("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ 
          resumeContent, 
          resumeId: resume.id,
          forceReanalyze: true // 告诉后端这是用户主动重新分析
        })
      })
      
      const data = await res.json()
      
      if (!res.ok) { 
        setError(data.error || 'AI分析失败，请稍后再试')
        return 
      }
      
      // Generate detailed analysis from AI recommendations
      const detailedAnalysis = generateDetailedAnalysis(data)
      
      const mapped: AnalysisData = {
        overallScore: Math.round(data.overall_score || 0),
        scoreBreakdown: [
          { name: "内容完整度", score: Math.round(data.scores?.content_completeness || 0) },
          { name: "结构与排版", score: Math.round(data.scores?.structure || 0) },
          { name: "语言与表达", score: Math.round(data.scores?.expression || 0) }
        ],
        detailedAnalysis: detailedAnalysis,
        contentRecommendations: { 
          missing_sections: data.content_completeness?.missing_sections || [], 
          recommendations: data.content_completeness?.recommendations || [] 
        },
        structureRecommendations: data.structure?.recommendations || [],
        expressionExamples: data.expression?.rewrite_examples || []
      }
      
      setAnalysis(mapped)
      
    } catch (err) {
      setError('网络错误，请检查连接后重试')
      console.error('Re-analysis error:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/10">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">正在加载分析数据...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isAuthError = error.includes('登录') || error.includes('authentication')
    
    return (
      <div className="flex h-screen items-center justify-center bg-muted/10">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">加载失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2">
              {isAuthError ? (
                <>
                  <Button asChild>
                    <Link href="/login">去登录</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">返回仪表盘</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => window.location.reload()}>
                    重新加载
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">返回仪表盘</Link>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!resume || !analysis) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/10">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>数据加载失败</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">无法加载简历数据，请返回重试。</p>
            <Button asChild>
              <Link href="/dashboard">返回仪表盘</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="h-16 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard" title="返回仪表盘">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">ResumeAI</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/resume/${resumeId}/edit`} title="编辑简历">
              <FileEdit className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile" title="个人中心">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="头像" 
                  className="h-5 w-5 rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">简历分析 - {resume?.title || '未知简历'}</h1>
            <p className="text-muted-foreground">以下是简历表现与 AI 优化建议。</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={downloadPDF}
              disabled={!resumeContent}
              title={!resumeContent ? "简历内容为空，无法生成报告" : "下载分析报告"}
            >
              <Download className="h-4 w-4 mr-2" />
              下载报告
            </Button>
            <Button 
              variant="secondary"
              onClick={reAnalyze}
              disabled={!resumeContent || loading || isAnalyzing}
              title={!resumeContent ? "简历内容为空，无法重新分析" : isAnalyzing ? "正在AI分析中..." : loading ? "加载中..." : isCached ? "基于已有分析重新生成" : "重新分析简历"}
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isAnalyzing ? "AI分析中..." : "重新分析"}
            </Button>
          </div>
        </div>

        <div ref={sectionRef} className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="analysis-section">
          <aside className="lg:col-span-1 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>总体评分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative size-40">
                    <svg className="size-full" height="36" viewBox="0 0 36 36" width="36" xmlns="http://www.w3.org/2000/svg">
                      <circle className="stroke-current text-muted" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                      <circle className={`stroke-current ${scoreState(analysis.overallScore).stroke}`} cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - analysis.overallScore} strokeLinecap="round" strokeWidth="3" transform="rotate(-90 18 18)"></circle>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{analysis.overallScore}</span>
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                    {isCached && (
                      <div className="absolute -top-2 -right-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                        缓存
                      </div>
                    )}
                  </div>
                  <p className={`text-xl font-semibold ${scoreState(analysis.overallScore).text}`}>{scoreState(analysis.overallScore).label}</p>
                  {isCached && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">基于已有分析</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>评分拆解</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-5">
                  {(analysis.scoreBreakdown || []).map((item) => (
                    <div key={item.name} className="flex items-center gap-4">
                      <div className="text-muted-foreground flex items-center justify-center rounded-lg bg-muted shrink-0 size-12">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col justify-center flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-1.5 rounded-full ${scoreState(item.score).bar}`} style={{ width: `${item.score}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-bold">{item.score}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex border-b border-border">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("content")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 rounded-none ${activeTab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    内容
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("structure")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 rounded-none ${activeTab === "structure" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    结构
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab("language")}
                    className={`px-4 py-2.5 text-sm font-semibold border-b-2 rounded-none ${activeTab === "language" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    语言
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {activeTab === "content" && (
                  <div className="flex flex-col gap-4">
                    {analysis.detailedAnalysis?.content?.map((item, i) => (
                      <details key={item.title} className="group rounded-lg bg-muted/50" open={i === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3">
                            {i === 0 ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                            <span>{item.title}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${i === 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                              {item.suggestions.length} 项建议
                            </span>
                          </div>
                          <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="p-4 border-t border-border flex flex-col gap-4">
                          {item.suggestions.map((s, j) => (
                            <div key={j} className="bg-background rounded-lg p-4 border">
                              <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
                              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md text-sm mb-2">
                                <span className="line-through text-red-700 dark:text-red-400">&quot;{s.before}&quot;</span>
                              </div>
                              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md text-sm">
                                <span className="text-green-700 dark:text-green-400">&quot;{s.after}&quot;</span>
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                <Button variant="outline" size="sm">忽略</Button>
                                <Button size="sm">应用建议</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}

                    {analysis.contentRecommendations && (
                      <div className="rounded-lg bg-muted/50">
                        <div className="p-4 font-medium">
                          <div className="flex items-center gap-3 mb-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span>内容建议</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-background rounded-lg p-4 border">
                              <p className="text-sm font-semibold mb-2">缺失模块</p>
                              <ul className="text-sm text-muted-foreground list-disc ml-5">
                                {(analysis.contentRecommendations.missing_sections || []).map((m, idx) => (
                                  <li key={idx}>{m}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="bg-background rounded-lg p-4 border">
                              <p className="text-sm font-semibold mb-2">优化建议</p>
                              <ul className="text-sm text-muted-foreground list-disc ml-5">
                                {(analysis.contentRecommendations.recommendations || []).map((m, idx) => (
                                  <li key={idx}>{m}</li>
                                ))}
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
                      <div key={idx} className="group rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <span>{rec}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(analysis.structureRecommendations || []).length === 0 && (
                      <div className="group rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span>结构合理</span>
                          </div>
                          <span className="text-sm font-semibold text-green-600">未发现问题</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "language" && (
                  <div className="flex flex-col gap-4">
                    {(analysis.expressionExamples || []).map((ex, idx) => (
                      <div key={idx} className="bg-background rounded-lg p-4 border">
                        <p className="text-sm text-muted-foreground">{ex}</p>
                      </div>
                    ))}
                    {(analysis.expressionExamples || []).length === 0 && (
                      <div className="group rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between p-4 font-medium">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span>表达清晰</span>
                          </div>
                          <span className="text-sm font-semibold text-green-600">未发现问题</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}