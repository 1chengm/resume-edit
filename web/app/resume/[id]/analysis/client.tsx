"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { authenticatedFetch } from "@/lib/authenticatedFetch"
import type { ResumeContent } from "@/types/resume"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Copy,
  Download,
  FileEdit,
  Loader2,
  RefreshCw,
  Target,
  User,
} from "lucide-react"

type ScoreItem = { name: string; score: number }
type Suggestion = { description: string; before: string; after: string; target: string }
type AnalysisData = {
  overallScore: number
  scoreBreakdown: ScoreItem[]
  detailedAnalysis: Suggestion[]
  contentRecommendations: string[]
  missingSections: string[]
  structureRecommendations: string[]
  expressionExamples: string[]
}

type AIAnalysisInput = {
  content_completeness?: { recommendations?: string[]; missing_sections?: string[] }
  structure?: { recommendations?: string[] }
  expression?: { rewrite_examples?: string[] }
  overall_score?: number
  scores?: { content_completeness?: number; structure?: number; expression?: number }
  is_cached?: boolean
}

function inferTarget(text: string) {
  const source = text.toLowerCase()
  if (source.includes("技能") || source.includes("skill")) return "skills"
  if (source.includes("项目") || source.includes("project")) return "projects"
  if (source.includes("教育") || source.includes("education")) return "education"
  if (source.includes("经历") || source.includes("经验") || source.includes("experience")) return "experience"
  if (source.includes("标题") || source.includes("联系方式") || source.includes("姓名")) return "personal"
  return "summary"
}

function mapAnalysis(ai: AIAnalysisInput, resumeContent?: ResumeContent | null): AnalysisData {
  const sourcePreview = resumeContent ? JSON.stringify(resumeContent).slice(0, 110) : "当前简历内容"
  const detailedAnalysis: Suggestion[] = [
    ...(ai.content_completeness?.recommendations || []).map((item) => ({
      description: item,
      before: sourcePreview,
      after: `建议补强：${item}`,
      target: inferTarget(item),
    })),
    ...(ai.structure?.recommendations || []).map((item) => ({
      description: item,
      before: "当前版式与结构",
      after: `建议调整：${item}`,
      target: inferTarget(item),
    })),
    ...(ai.expression?.rewrite_examples || []).slice(0, 3).map((item) => ({
      description: "表达可更具体",
      before: "原表达",
      after: item,
      target: inferTarget(item),
    })),
  ]

  return {
    overallScore: Math.round(ai.overall_score || 0),
    scoreBreakdown: [
      { name: "内容完整度", score: Math.round(ai.scores?.content_completeness || 0) },
      { name: "结构与排版", score: Math.round(ai.scores?.structure || 0) },
      { name: "语言与表达", score: Math.round(ai.scores?.expression || 0) },
    ],
    detailedAnalysis,
    contentRecommendations: ai.content_completeness?.recommendations || [],
    missingSections: ai.content_completeness?.missing_sections || [],
    structureRecommendations: ai.structure?.recommendations || [],
    expressionExamples: ai.expression?.rewrite_examples || [],
  }
}

export default function AnalysisClient({ resumeId }: { resumeId: string }) {
  const [resume, setResume] = useState<{ id: string; title: string } | null>(null)
  const [resumeContent, setResumeContent] = useState<ResumeContent | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null }>({ display_name: null, avatar_url: null })
  const [loading, setLoading] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCached, setIsCached] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ignored, setIgnored] = useState<string[]>([])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const [profileRes, resumeRes] = await Promise.all([
          authenticatedFetch("/api/profile"),
          authenticatedFetch(`/api/resumes/${resumeId}`),
        ])

        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile({ display_name: profileData.display_name, avatar_url: profileData.avatar_url })
        }

        const resumeData = await resumeRes.json()
        if (!resumeRes.ok) throw new Error(resumeData.error || "Failed to load resume")

        setResume({ id: resumeData.id, title: resumeData.title })
        setResumeContent(resumeData.content_json || null)

        if (!resumeData.content_json) {
          setAnalysis(mapAnalysis({ overall_score: 0, scores: {} }, null))
          return
        }

        const analysisRes = await authenticatedFetch("/api/ai/analyze", {
          method: "POST",
          body: JSON.stringify({ resumeContent: resumeData.content_json, resumeId: resumeData.id }),
        })
        const analysisData = await analysisRes.json()
        if (!analysisRes.ok) throw new Error(analysisData.error || "AI analysis failed")
        setIsCached(analysisData.is_cached === true)
        setAnalysis(mapAnalysis(analysisData, resumeData.content_json))
      } catch (loadError) {
        console.error(loadError)
        setError(loadError instanceof Error ? loadError.message : "加载分析失败")
      } finally {
        setLoading(false)
      }
    }
    if (resumeId) void load()
  }, [resumeId])

  async function reAnalyze() {
    if (!resumeContent || !resume?.id) return
    try {
      setIsAnalyzing(true)
      setError(null)
      const res = await authenticatedFetch("/api/ai/analyze", {
        method: "POST",
        body: JSON.stringify({ resumeContent, resumeId: resume.id, forceReanalyze: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI 分析失败")
      setIsCached(false)
      setIgnored([])
      setAnalysis(mapAnalysis(data, resumeContent))
    } catch (analysisError) {
      console.error(analysisError)
      setError(analysisError instanceof Error ? analysisError.message : "重新分析失败")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const visibleSuggestions = (analysis?.detailedAnalysis || []).filter((item) => !ignored.includes(item.after))
  const topActions = visibleSuggestions.slice(0, 3)

  if (loading) {
    return <div className="atelier-loading"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  if (error || !resume || !analysis) {
    return (
      <div className="atelier-loading">
        <Card className="w-[28rem] max-w-[92vw]">
          <CardHeader><CardTitle className="text-destructive">加载失败</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error || "无法读取简历分析数据"}</p>
            <div className="flex gap-2">
              <Button asChild><Link href="/dashboard">返回仪表盘</Link></Button>
              <Button variant="outline" onClick={() => window.location.reload()}>重新加载</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen atelier-app-bg atelier-grid-bg">
      <header className="atelier-topbar sticky top-0 z-20 flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <div>
            <h1 className="text-lg font-semibold">AI Analysis</h1>
            <p className="text-xs text-muted-foreground">总结优先，可直接回跳到编辑页处理问题</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><Link href={`/resume/${resumeId}/jd-match`}><Target className="mr-2 h-4 w-4" />JD Match</Link></Button>
          <Button variant="outline" asChild><Link href={`/resume/${resumeId}/edit`}><FileEdit className="mr-2 h-4 w-4" />编辑简历</Link></Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile">
              {profile.avatar_url ? <Image src={profile.avatar_url} alt="头像" width={20} height={20} unoptimized className="h-5 w-5 rounded-full object-cover" /> : <User className="h-5 w-5" />}
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 md:p-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <Card className="atelier-panel border-border/70">
            <CardContent className="px-6 py-8 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Overall Score</p>
              <div className="relative mx-auto mt-5 size-40">
                <svg className="size-full" viewBox="0 0 36 36">
                  <circle className="stroke-muted" cx="18" cy="18" r="16" fill="none" strokeWidth="3" />
                  <circle className="stroke-primary" cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - analysis.overallScore} strokeLinecap="round" transform="rotate(-90 18 18)" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{analysis.overallScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-center gap-2">
                {isCached && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">缓存结果</span>}
                <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" />导出</Button>
              </div>
              <Button className="mt-3 w-full" onClick={reAnalyze} disabled={isAnalyzing}>
                {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isAnalyzing ? "分析中..." : "重新分析"}
              </Button>
            </CardContent>
          </Card>

          <Card className="atelier-panel border-border/70">
            <CardHeader><CardTitle className="text-lg">评分拆解</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {analysis.scoreBreakdown.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="font-semibold">{item.score}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="atelier-panel border-border/70">
            <CardHeader><CardTitle className="text-lg">最优先动作</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {topActions.map((item) => (
                <div key={item.after} className="rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm leading-6">{item.after}</p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href={`/resume/${resumeId}/edit?section=${item.target}&hint=${encodeURIComponent(item.after)}`}>
                      <FileEdit className="mr-2 h-3.5 w-3.5" />
                      去修改
                    </Link>
                  </Button>
                </div>
              ))}
              {topActions.length === 0 && <p className="text-sm text-muted-foreground">当前没有待处理动作。</p>}
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          {error && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{error}</div>
            </div>
          )}

          <Card className="atelier-panel border-border/70">
            <CardHeader>
              <CardTitle className="text-2xl">简历分析 - {resume.title}</CardTitle>
              <p className="text-sm text-muted-foreground">先处理高优先级建议，再回到编辑页调整对应模块。</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <SummaryBlock icon={AlertTriangle} title="缺失模块" items={analysis.missingSections} emptyText="未发现明显缺失模块" tone="amber" />
              <SummaryBlock icon={BarChart3} title="结构建议" items={analysis.structureRecommendations} emptyText="结构表现稳定" tone="blue" />
              <SummaryBlock icon={CheckCircle} title="表达建议" items={analysis.expressionExamples} emptyText="表达层未发现明显问题" tone="emerald" />
            </CardContent>
          </Card>

          <Card className="atelier-panel border-border/70">
            <CardHeader><CardTitle className="text-xl">可执行建议</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {visibleSuggestions.map((item) => (
                <div key={item.after} className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{item.description}</p>
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{item.before}</div>
                      <div className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{item.after}</div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(item.after)}><Copy className="mr-2 h-3.5 w-3.5" />复制建议</Button>
                        <Button size="sm" asChild>
                          <Link href={`/resume/${resumeId}/edit?section=${item.target}&hint=${encodeURIComponent(item.after)}`}>
                            <FileEdit className="mr-2 h-3.5 w-3.5" />
                            去对应模块
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setIgnored((prev) => [...prev, item.after])}>忽略</Button>
                  </div>
                </div>
              ))}
              {visibleSuggestions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  当前所有建议都已处理或忽略。
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

function SummaryBlock({
  icon: Icon,
  title,
  items,
  emptyText,
  tone,
}: {
  icon: typeof AlertTriangle
  title: string
  items: string[]
  emptyText: string
  tone: "amber" | "blue" | "emerald"
}) {
  const toneClass = tone === "amber" ? "text-amber-700 bg-amber-50" : tone === "blue" ? "text-blue-700 bg-blue-50" : "text-emerald-700 bg-emerald-50"
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex items-center gap-2 font-medium"><Icon className={`h-4 w-4 ${tone === "amber" ? "text-amber-600" : tone === "blue" ? "text-blue-600" : "text-emerald-600"}`} />{title}</div>
      <div className="mt-3 space-y-2">
        {items.length > 0 ? items.map((item) => <div key={item} className={`rounded-xl px-3 py-2 text-sm ${toneClass}`}>{item}</div>) : <p className="text-sm text-muted-foreground">{emptyText}</p>}
      </div>
    </div>
  )
}
