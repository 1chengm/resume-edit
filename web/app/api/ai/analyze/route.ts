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
    const resumeId = body.resumeId
    const forceReanalyze = body.forceReanalyze || false // 用户点击重新分析时设置为true
    
    if (!resumeContent) return NextResponse.json({ error: 'Missing resumeContent' }, { status: 400 })

    const sanitized = sanitizeResume(resumeContent)
    const hash = crypto.createHash('sha256').update(JSON.stringify(sanitized)).digest('hex')

    console.log('🔍 Checking for existing AI analysis...')
    
    // 检查是否有现有的分析结果（除非用户强制重新分析）
    if (resumeId && !forceReanalyze) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: req.headers.get('authorization') || '' } }
      })
      
      // 查找最近的分析记录
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
        console.log('✅ Found existing AI analysis, returning cached result')
        console.log('📊 Cached analysis from:', existingAnalysis.created_at)
        console.log('📊 Cached model:', existingAnalysis.model)
        
        // 添加缓存标识，让前端知道这是缓存结果
        const cachedResult = {
          ...existingAnalysis.output_json,
          is_cached: true,
          cached_at: existingAnalysis.created_at,
          cached_model: existingAnalysis.model
        }
        return NextResponse.json(cachedResult)
      }
    }

    console.log('🤖 No cached analysis found or forced reanalysis, calling AI...')
    console.log('🔧 Environment:', {
      aiProvider: process.env.AI_PROVIDER,
      deepseekConfigured: !!process.env.DEEPSEEK_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY
    })

    console.log('📊 Sanitized content length:', JSON.stringify(sanitized).length, 'characters')

    const prompt = getPrompt('ai_resume_analysis_prompt')
    console.log('📝 Loaded prompt, length:', prompt.length, 'characters')
    console.log('📝 Prompt preview:', prompt.substring(0, 200) + '...')

    // Ensure prompt contains "json" for DeepSeek API
    const jsonPrompt = prompt.includes('json') ? prompt : prompt + "\n\nImportant: Please return the analysis results in valid JSON format."
    console.log('🔧 Final prompt contains "json":', jsonPrompt.includes('json'))

    console.log('🤖 Initializing AI model...')
    const model = process.env.AI_PROVIDER === 'deepseek' ? deepseek('deepseek-chat') : openai('gpt-4o-mini')
    console.log('✅ AI model initialized:', process.env.AI_PROVIDER || 'openai')

    console.log('🎯 Calling AI generateObject...')
    const { object } = await generateObject({
      model,
      schema: ResumeAnalysisSchema as unknown as z.ZodTypeAny,
      system: jsonPrompt,
      prompt: JSON.stringify(sanitized)
    })
    
    console.log('✅ AI analysis successful!')
    console.log('📊 Result overview:', {
      overallScore: object.overall_score,
      contentScore: object.scores?.content_completeness,
      structureScore: object.scores?.structure,
      expressionScore: object.scores?.expression
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