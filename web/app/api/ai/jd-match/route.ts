import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { generateObject, generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { deepseek } from '@ai-sdk/deepseek'
import { requireApiUser } from '@/lib/auth/require-user'
import { sanitizeResume } from '@/lib/sanitize'
import { getPrompt } from '@/lib/yaml-prompts'
import { JDMatchSchema } from '@/types/ai'
import { parseChineseJSON } from '@/lib/chinese-key-mapper'

export async function POST(req: NextRequest) {
  try {
    const { user, supabase, response } = await requireApiUser()
    if (response) return response
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const resumeContent = body.resumeContent
    const jdText = typeof body.jdText === 'string' ? body.jdText.trim() : ''
    const resumeId = body.resumeId
    const forceRematch = body.forceRematch || false

    if (!resumeContent) {
      return NextResponse.json({ error: 'Missing resumeContent' }, { status: 400 })
    }

    if (!jdText) {
      return NextResponse.json({ error: 'Missing jdText' }, { status: 400 })
    }

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

    const sanitizedResume = sanitizeResume(resumeContent)
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ resume: sanitizedResume, jdText }))
      .digest('hex')

    if (resumeId && !forceRematch) {
      const { data: existingMatch, error: fetchError } = await supabase
        .from('ai_analysis_history')
        .select('output_json, created_at, model')
        .eq('resume_id', resumeId)
        .eq('type', 'jd')
        .eq('input_hash', hash)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!fetchError && existingMatch) {
        return NextResponse.json({
          ...existingMatch.output_json,
          is_cached: true,
          cached_at: existingMatch.created_at,
          cached_model: existingMatch.model,
        })
      }
    }

    const provider = process.env.AI_PROVIDER || 'openai'
    const model = provider === 'deepseek' ? deepseek('deepseek-chat') : openai('gpt-4o-mini')
    const prompt = getPrompt('ai_jd_match_prompt')

    let result

    if (provider === 'deepseek') {
      const { text } = await generateText({
        model,
        system: prompt,
        prompt: JSON.stringify({
          resume: sanitizedResume,
          job_description: jdText,
        }),
      })

      result = parseChineseJSON(text)
    } else {
      const { object } = await generateObject({
        model,
        schema: JDMatchSchema,
        system: prompt,
        prompt: JSON.stringify({
          resume: sanitizedResume,
          job_description: jdText,
        }),
      })
      result = object
    }

    if (resumeId) {
      await supabase.from('ai_analysis_history').insert({
        resume_id: resumeId,
        type: 'jd',
        model: provider,
        input_hash: hash,
        output_json: result,
      })
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('JD match error:', error)
    const message = error instanceof Error ? error.message : 'JD match failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
