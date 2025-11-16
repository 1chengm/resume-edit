import { z } from 'zod'

export const ResumeAnalysisSchema = z.object({
  overall_score: z.number().min(0).max(100),
  scores: z.object({
    content_completeness: z.number().min(0).max(100),
    structure: z.number().min(0).max(100),
    expression: z.number().min(0).max(100)
  }),
  content_completeness: z.object({
    missing_sections: z.array(z.string()),
    recommendations: z.array(z.string())
  }),
  structure: z.object({ recommendations: z.array(z.string()) }),
  expression: z.object({ rewrite_examples: z.array(z.string()) })
})

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>

export const JDMatchSchema = z.object({
  match_score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  recommendations: z.array(z.string())
})

export type JDMatch = z.infer<typeof JDMatchSchema>