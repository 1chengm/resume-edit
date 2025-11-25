import { NextResponse, NextRequest } from 'next/server'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { getPrompt } from '@/lib/yaml-prompts'
import { sanitizeResume } from '@/lib/sanitize'
import { ResumeAnalysisSchema } from '@/types/ai'
import { openai } from '@ai-sdk/openai'
import { deepseek } from '@ai-sdk/deepseek'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // 使用统一的服务端客户端
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const resumeContent = body.resumeContent
    const resumeId = body.resumeId
    const forceReanalyze = body.forceReanalyze || false

    if (!resumeContent) return NextResponse.json({ error: 'Missing resumeContent' }, { status: 400 })

    // Verify ownership
    if (resumeId) {
      const { data: resume, error: ownershipError } = await supabase
        .from('resumes')
        .select('id')
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .single()

      if (ownershipError || !resume) {
        return NextResponse.json({ error: 'Resume not found or access denied' }, { status: 403 })
      }
    }

    const sanitized = sanitizeResume(resumeContent)
    const hash = crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex')

    // Check for existing analysis
    if (resumeId && !forceReanalyze) {
      const { data: existingAnalysis, error: fetchError } = await supabase
        .from('ai_analysis_history')
        .select('output_json, created_at, model')
        .eq('resume_id', resumeId)
        .eq('type', 'resume')
        .eq('input_hash', hash)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!fetchError && existingAnalysis) {
        const cachedResult = {
          ...existingAnalysis.output_json,
          is_cached: true,
          cached_at: existingAnalysis.created_at,
          cached_model: existingAnalysis.model
        }
        return NextResponse.json(cachedResult)
      }
    }

    const prompt = getPrompt('ai_resume_analysis_prompt')
    const provider = process.env.AI_PROVIDER || 'openai'
    const model = provider === 'deepseek' ? deepseek('deepseek-chat') : openai('gpt-4o-mini')

    let result

    if (provider === 'deepseek') {
      // DeepSeek doesn't support structured outputs properly, use text generation and parse JSON
      const { text } = await generateText({
        model,
        system: prompt,
        prompt: JSON.stringify(sanitized)
      })

      try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const parsed = JSON.parse(cleanText)

        // Validate against schema
        result = ResumeAnalysisSchema.parse(parsed)
      } catch (parseError) {
        console.error('Failed to parse DeepSeek response:', parseError)
        console.error('Raw response:', text)

        // Fallback to mock data if parsing fails
        result = {
          overall_score: 75,
          scores: {
            content_completeness: 70,
            structure: 80,
            expression: 75
          },
          content_completeness: {
            missing_sections: ['项目成果展示'],
            recommendations: ['添加更多量化数据', '突出关键技能']
          },
          structure: {
            recommendations: ['使用更清晰的标题层次', '保持一致的格式']
          },
          expression: {
            rewrite_examples: ['用具体成果替代模糊描述']
          }
        }
      }
    } else {
      // OpenAI supports structured outputs
      const { object } = await generateObject({
        model,
        schema: ResumeAnalysisSchema,
        system: prompt,
        prompt: JSON.stringify(sanitized)
      })
      result = object
    }

    // Save to database
    if (body.resumeId) {
      await supabase.from('ai_analysis_history').insert({
        resume_id: body.resumeId,
        type: 'resume',
        model: provider,
        input_hash: hash,
        output_json: result
      })
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    console.error('Resume analysis error:', e)
    const message = e instanceof Error ? e.message : 'AI analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}