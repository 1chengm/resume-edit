'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import type { JDMatch } from '@/types/ai'
import type { ResumeContent } from '@/types/resume'
import { authenticatedFetch } from '@/src/lib/authenticatedFetch'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  FileEdit,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Copy,
  Loader2,
  ThumbsUp
} from "lucide-react"
import Link from "next/link"

export default function JDMatchPage() {
  const [resumeJson, setResumeJson] = useState('')
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<JDMatch | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const params = useParams()
  const id = params?.id as string

  useEffect(() => {
    setIsClient(true)
  }, [])

  async function match() {
    setError('')
    setResult(null)
    setLoading(true)
    let content: ResumeContent
    try {
      content = JSON.parse(resumeJson || '{}')
    } catch {
      setError('Invalid Resume JSON format')
      setLoading(false)
      return
    }

    try {
      const res = await authenticatedFetch('/api/ai/jd-match', {
        method: 'POST',
        body: JSON.stringify({ resumeContent: content, jdText, resumeId: id })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Match failed'); return }
      setResult(data)
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">JD Match Analysis</h1>
          <p className="text-muted-foreground">Paste the job description to see how well your resume matches.</p>
        </div>
        <Link href={isClient && id ? `/resume/${id}/edit` : '#'}>
          <Button className="gap-2">
            <FileEdit className="h-4 w-4" />
            Edit Resume
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Input Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              className="min-h-[160px] font-mono text-xs"
              placeholder="Resume JSON (Optional)"
              value={resumeJson}
              onChange={e => setResumeJson(e.target.value)}
            />
            <Textarea
              className="min-h-[160px]"
              placeholder="Paste Job Description here..."
              value={jdText}
              onChange={e => setJdText(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1">Upload JD</Button>
              <Button className="flex-1" onClick={match} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Analyze
              </Button>
            </div>
            {error && <p className="text-sm text-destructive font-medium">{error}</p>}
          </CardContent>
        </Card>

        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col items-center text-center p-6">
            <h3 className="text-lg font-semibold mb-4">Match Score</h3>
            <div className="relative size-48 mb-4">
              <svg className="size-full" viewBox="0 0 36 36">
                <circle className="stroke-muted" cx="18" cy="18" r="16" fill="none" strokeWidth="3" />
                <circle
                  className="stroke-primary transition-all duration-1000 ease-out"
                  cx="18" cy="18" r="16" fill="none" strokeWidth="3"
                  strokeDasharray="100"
                  strokeDashoffset={100 - (result?.match_score || 0)}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-extrabold text-primary">{result?.match_score ?? 0}%</span>
              </div>
            </div>
            <p className="text-muted-foreground">
              {result ? 'Analysis complete. See details below.' : 'Waiting for analysis...'}
            </p>
          </Card>

          {result && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Matched Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.strengths.map((s, i) => (
                    <span key={i} className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Missing Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.gaps.map((s, i) => (
                    <span key={i} className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground text-center">
                No recommendations yet.
              </div>
            ) : (
              <ul className="space-y-3">
                {result.recommendations.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg group">
                    <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{s}</p>
                    </div>
                    <button
                      className="text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => navigator.clipboard.writeText(s)}
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}