'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { JDMatch } from '@/types/ai'
import type { ResumeContent } from '@/types/resume'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Copy,
  FileEdit,
  FileUp,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'

type ResumeSummary = {
  id: string
  title: string
  template: string
  content_json: ResumeContent
}

function inferTargetSection(text: string) {
  const source = text.toLowerCase()
  if (source.includes('技能') || source.includes('skill')) return 'skills'
  if (source.includes('项目') || source.includes('project')) return 'projects'
  if (source.includes('教育') || source.includes('学历') || source.includes('education')) return 'education'
  if (source.includes('经历') || source.includes('经验') || source.includes('experience')) return 'experience'
  if (source.includes('标题') || source.includes('求职') || source.includes('联系方式')) return 'personal'
  return 'summary'
}

export default function JDMatchPage() {
  const params = useParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const id = params?.id as string

  const [resume, setResume] = useState<ResumeSummary | null>(null)
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<(JDMatch & { is_cached?: boolean }) | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingResume, setLoadingResume] = useState(true)

  useEffect(() => {
    async function loadResume() {
      try {
        setLoadingResume(true)
        setError('')

        const res = await authenticatedFetch(`/api/resumes/${id}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '加载简历失败')
          return
        }

        setResume({
          id: data.id,
          title: data.title,
          template: data.template,
          content_json: data.content_json || {},
        })
      } catch (loadError) {
        console.error(loadError)
        setError('加载简历失败，请稍后重试')
      } finally {
        setLoadingResume(false)
      }
    }

    if (id) {
      loadResume()
    }
  }, [id])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setJdText(text)
      setError('')
    } catch (uploadError) {
      console.error(uploadError)
      setError('读取 JD 文件失败，请改用粘贴文本')
    } finally {
      event.target.value = ''
    }
  }

  async function match(forceRematch = false) {
    if (!resume?.content_json) {
      setError('当前简历内容为空，请先补充简历')
      return
    }

    if (!jdText.trim()) {
      setError('请先输入岗位描述')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await authenticatedFetch('/api/ai/jd-match', {
        method: 'POST',
        body: JSON.stringify({
          resumeContent: resume.content_json,
          jdText,
          resumeId: id,
          forceRematch,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '岗位匹配失败')
        return
      }

      setResult(data)
    } catch (matchError) {
      console.error(matchError)
      setError('网络异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const resumeSkillCount = resume?.content_json.skills?.length || 0
  const experienceCount = resume?.content_json.experience?.length || 0
  const projectCount = resume?.content_json.projects?.length || 0

  return (
    <div className="min-h-screen atelier-app-bg atelier-grid-bg">
      <header className="atelier-topbar sticky top-0 z-20 flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={id ? `/resume/${id}/edit` : '/dashboard'} aria-label="返回编辑页">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">JD Match</h1>
            <p className="text-xs text-muted-foreground">以当前简历为基础做岗位匹配分析</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild className="hidden sm:inline-flex">
            <Link href={`/resume/${id}/analysis`}>
              <Sparkles className="mr-2 h-4 w-4" />
              查看 AI 分析
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/resume/${id}/edit`}>
              <FileEdit className="mr-2 h-4 w-4" />
              编辑简历
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 md:p-8 xl:grid-cols-[1.05fr_0.9fr_1.05fr]">
        <section className="space-y-6">
          <Card className="atelier-panel border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">当前简历</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingResume ? (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载简历内容...
                </div>
              ) : resume ? (
                <>
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <p className="text-sm text-muted-foreground">已选简历</p>
                    <h2 className="mt-1 text-lg font-semibold">{resume.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-3 py-1">模板 {resume.template}</span>
                      <span className="rounded-full bg-muted px-3 py-1">{experienceCount} 段经历</span>
                      <span className="rounded-full bg-muted px-3 py-1">{projectCount} 个项目</span>
                      <span className="rounded-full bg-muted px-3 py-1">{resumeSkillCount} 项技能</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
                      <p className="mt-2 line-clamp-5 text-sm text-foreground">
                        {resume.content_json.summary || '当前还没有职业摘要，JD 匹配建议会更多落在经历和技能上。'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Skills Snapshot</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(resume.content_json.skills || []).slice(0, 10).map((skill, index) => (
                          <span key={index} className="rounded-full border border-border px-3 py-1 text-xs">
                            {skill}
                          </span>
                        ))}
                        {(resume.content_json.skills || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">暂无技能标签</p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-sm text-destructive">
                  {error || '未找到简历数据'}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="atelier-panel border-border/70">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">岗位描述</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                className="min-h-[320px] bg-background/85 text-sm leading-6"
                placeholder="粘贴完整 JD，包括职责、必备技能、加分项和业务背景。"
                value={jdText}
                onChange={(event) => setJdText(event.target.value)}
              />

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={handleUpload}
                />
                <Button variant="outline" className="sm:flex-1" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="mr-2 h-4 w-4" />
                  导入 TXT / MD
                </Button>
                <Button className="sm:flex-1" onClick={() => match(false)} disabled={loading || loadingResume}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
                  开始匹配
                </Button>
              </div>

              <div className="rounded-2xl bg-muted/35 p-4 text-sm text-muted-foreground">
                当前策略：默认直接使用这份简历的结构、经历与技能做匹配，不再要求手动粘贴 Resume JSON。
              </div>

              {error && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="atelier-panel border-border/70">
            <CardContent className="flex flex-col items-center px-6 py-8 text-center">
              <div className="mb-6 rounded-full bg-primary/10 p-3 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Match Score</p>
              <div className="relative mt-5 size-52">
                <svg className="size-full" viewBox="0 0 36 36">
                  <circle className="stroke-muted" cx="18" cy="18" r="16" fill="none" strokeWidth="3" />
                  <circle
                    className="stroke-primary transition-all duration-700 ease-out"
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    strokeWidth="3"
                    strokeDasharray="100"
                    strokeDashoffset={100 - (result?.match_score || 0)}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-primary">{result?.match_score ?? 0}</span>
                  <span className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">out of 100</span>
                </div>
              </div>
              <p className="mt-5 max-w-[20rem] text-sm text-muted-foreground">
                {result ? '分析已完成，建议优先处理右侧缺口与推荐动作。' : '先输入 JD，再运行匹配分析。'}
              </p>
              {result?.is_cached && (
                <span className="mt-4 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                  已使用缓存结果
                </span>
              )}

              <div className="mt-6 flex w-full gap-3">
                <Button variant="outline" className="flex-1" onClick={() => match(true)} disabled={loading || !jdText.trim()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  重新匹配
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={!result}
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(
                        {
                          score: result?.match_score,
                          strengths: result?.strengths,
                          gaps: result?.gaps,
                          recommendations: result?.recommendations,
                        },
                        null,
                        2
                      )
                    )
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  复制结果
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="atelier-panel border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                已覆盖关键词
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(result?.strengths || []).map((item, index) => (
                  <span key={index} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    {item}
                  </span>
                ))}
                {!result && <p className="text-sm text-muted-foreground">匹配完成后展示优势关键词。</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="atelier-panel border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                待补关键差距
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(result?.gaps || []).map((item, index) => (
                  <span key={index} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                    {item}
                  </span>
                ))}
                {!result && <p className="text-sm text-muted-foreground">匹配完成后展示核心缺口。</p>}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="atelier-panel border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">推荐动作</CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                  运行匹配后，这里会生成可执行的改写建议与跳转入口。
                </div>
              ) : (
                <ul className="space-y-3">
                  {result.recommendations.map((item, index) => {
                    const target = inferTargetSection(item)

                    return (
                      <li key={index} className="rounded-2xl border border-border bg-background/70 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                            <Lightbulb className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm leading-6 text-foreground">{item}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigator.clipboard.writeText(item)}
                              >
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                复制建议
                              </Button>
                              <Button size="sm" asChild>
                                <Link href={`/resume/${id}/edit?section=${target}&hint=${encodeURIComponent(item)}`}>
                                  <FileEdit className="mr-2 h-3.5 w-3.5" />
                                  去对应模块修改
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
