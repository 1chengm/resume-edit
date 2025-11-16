'use client'
import { useState } from 'react'
import type { JDMatch } from '@/types/ai'
import type { ResumeContent } from '@/types/resume'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

export default function JDMatchPage() {
  const [resumeJson, setResumeJson] = useState('')
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<JDMatch | null>(null)
  const [error, setError] = useState('')
  const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''

  async function match() {
    setError('')
    setResult(null)
    let content: ResumeContent
    try { content = JSON.parse(resumeJson || '{}') } catch { setError('简历 JSON 格式错误'); return }
    const id = typeof window !== 'undefined' ? location.pathname.split('/')[2] : ''
    const res = await authenticatedFetch('/api/ai/jd-match', {
      method: 'POST',
      body: JSON.stringify({ resumeContent: content, jdText, resumeId: id })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || '匹配失败'); return }
    setResult(data)
  }

  return (
    <div className="p-8">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-black">JD 匹配分析</p>
          <p className="text-gray-500 text-sm">粘贴岗位描述，查看匹配度与优化建议。</p>
        </div>
        <a className="flex min-w-[84px] items-center justify-center gap-2 rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold hover:bg-primary/90" href={`/resume/${id}/edit`}>
          <span className="material-symbols-outlined">edit_document</span>
          <span className="truncate">编辑我的简历</span>
        </a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3 bg-white border border-[#EAEAEA] rounded-xl p-6">
          <h2 className="text-lg font-bold">输入 JD</h2>
          <textarea className="w-full h-40 border rounded-lg p-3" placeholder="简历 JSON（可选）" value={resumeJson} onChange={e => setResumeJson(e.target.value)} />
          <textarea className="w-full h-40 border rounded-lg p-3" placeholder="粘贴 JD 描述" value={jdText} onChange={e => setJdText(e.target.value)} />
          <div className="flex gap-3">
            <button className="h-10 px-4 rounded-lg bg-gray-200 text-gray-800 font-bold">上传 JD</button>
            <button className="h-10 px-4 rounded-lg bg-primary text-white font-bold" onClick={match}>开始匹配</button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-6 flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold mb-2">总体匹配度</h3>
            <div className="relative size-48">
              <svg className="size-full" viewBox="0 0 36 36">
                <circle className="stroke-current text-gray-200" cx="18" cy="18" r="16" fill="none" strokeWidth="3" />
                <circle className="stroke-current text-primary" cx="18" cy="18" r="16" fill="none" strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - (result?.match_score || 0)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-extrabold text-primary">{result?.match_score ?? 0}%</span>
              </div>
            </div>
            <p className="mt-4 text-gray-600">{result ? '你是较强候选人，可进一步提升匹配度。' : '分析后显示评分。'}</p>
          </div>
          {result && (
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><span className="material-symbols-outlined text-green-500">check_circle</span> 匹配关键词</h3>
              <div className="flex flex-wrap gap-2">
                {result.strengths.map((s, i) => (<span key={i} className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">{s}</span>))}
              </div>
            </div>
          )}
          {result && (
            <div className="bg-white border border-[#EAEAEA] rounded-xl p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><span className="material-symbols-outlined text-amber-500">warning</span> 待补充关键词</h3>
              <div className="flex flex-wrap gap-2">
                {result.gaps.map((s, i) => (<span key={i} className="bg-amber-100 text-amber-800 text-sm font-medium px-3 py-1 rounded-full">{s}</span>))}
              </div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1 bg-white border border-[#EAEAEA] rounded-xl p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold mb-4"><span className="material-symbols-outlined">recommend</span> 行动建议</h3>
          {!result ? (
            <div className="p-3 bg-gray-100 rounded-lg text-sm">暂无</div>
          ) : (
            <ul className="space-y-3">
              {result.recommendations.map((s, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="material-symbols-outlined text-primary mt-1">lightbulb</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{s}</p>
                  </div>
                  <button className="text-gray-500 hover:text-primary" onClick={() => navigator.clipboard.writeText(s)}>
                    <span className="material-symbols-outlined text-base">content_copy</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}