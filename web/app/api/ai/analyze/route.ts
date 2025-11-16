import { NextResponse, NextRequest } from 'next/server'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getPrompt } from '@/lib/yaml-prompts'
import { sanitizeResume } from '@/lib/sanitize'
import { ResumeAnalysisSchema } from '@/types/ai'
import { openai } from '@ai-sdk/openai'
import { deepseek } from '@ai-sdk/deepseek'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/api-auth'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    // 首先进行认证检查
    const { user, error: authError } = await authenticateRequest(req)
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const resumeContent = body.resumeContent
    if (!resumeContent) return NextResponse.json({ error: 'Missing resumeContent' }, { status: 400 })

    const sanitized = sanitizeResume(resumeContent)
    const prompt = getPrompt('ai_resume_analysis_prompt')

    const model = process.env.AI_PROVIDER === 'deepseek' ? deepseek('deepseek-chat') : openai('gpt-4o-mini')
    const { object } = await generateObject({
      model,
      schema: ResumeAnalysisSchema as unknown as z.ZodTypeAny,
      system: prompt,
      prompt: JSON.stringify(sanitized)
    })

    // 使用简单客户端写入数据库
    if (body.resumeId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.get('authorization') || '' } }
      })
      const hash = crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex')
      await supabase.from('ai_analysis_history').insert({
        resume_id: body.resumeId,
        type: 'resume',
        model: process.env.AI_PROVIDER || 'openai',
        input_hash: hash,
        output_json: object
      })
    }
    return NextResponse.json(object)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'AI analysis failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}