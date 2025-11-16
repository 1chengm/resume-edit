import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import AnalysisClient from "./client"
import type { ResumeContent } from "@/types/resume"

export default async function ResumeAnalysisPage({ params }: { params: { id: string } }) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const resumeId = params.id
  const { data: resume } = await supabase.from("resumes").select("id,title").eq("id", resumeId).single()
  const { data: content } = await supabase.from("resume_content").select("content_json").eq("resume_id", resumeId).single()

  const initialAnalysis = {
    overallScore: 85,
    scoreBreakdown: [
      { name: "内容完整度", score: 92 },
      { name: "结构与排版", score: 88 },
      { name: "语言与表达", score: 75 }
    ],
    detailedAnalysis: {
      content: [
        {
          title: "缺少量化指标",
          suggestions: [
            { description: "使用数据量化成果，突出影响力。", before: "负责团队并上线新功能。", after: "带领 5 人团队上线新功能，用户参与度提升 15%。" },
            { description: "补充工作规模，体现职责范围。", before: "负责项目预算。", after: "管理 50 万美元预算，项目低于预算 10% 完成。" }
          ]
        },
        {
          title: "缺少联系信息",
          suggestions: [
            { description: "添加邮箱与手机号，便于联系。", before: "无", after: "john.doe@email.com | (123) 456-7890" }
          ]
        }
      ]
    }
  }

  const contentJson = (content && (content as { content_json: ResumeContent }).content_json) || null
  return (
    <AnalysisClient
      resume={{ id: resumeId, title: resume?.title || "未命名简历" }}
      resumeContent={contentJson}
      initialAnalysis={initialAnalysis}
    />
  )
}
