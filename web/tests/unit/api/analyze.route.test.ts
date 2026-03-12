import { NextResponse } from 'next/server'
import { POST } from '@/app/api/ai/analyze/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { generateObject, generateText } from 'ai'
import { getPrompt } from '@/lib/yaml-prompts'
import { mockUser } from './test-helpers'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

vi.mock('ai', () => ({
  generateObject: vi.fn(),
  generateText: vi.fn(),
}))

vi.mock('@/lib/yaml-prompts', () => ({
  getPrompt: vi.fn(),
}))

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(() => 'openai-model'),
}))

vi.mock('@ai-sdk/deepseek', () => ({
  deepseek: vi.fn(() => 'deepseek-model'),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)
const mockedGenerateObject = vi.mocked(generateObject)
const mockedGenerateText = vi.mocked(generateText)
const mockedGetPrompt = vi.mocked(getPrompt)

function createSupabaseMock(options?: {
  ownership?: { data: { id: string } | null; error: { message: string } | null }
  cached?: { data: { output_json: Record<string, unknown>; created_at: string; model: string } | null; error: { message: string } | null }
}) {
  const opts = {
    ownership: { data: { id: 'resume-1' }, error: null } as { data: { id: string } | null; error: { message: string } | null },
    cached: { data: null, error: { message: 'not found' } } as { data: { output_json: Record<string, unknown>; created_at: string; model: string } | null; error: { message: string } | null },
    ...options,
  }

  const insert = vi.fn(async () => ({ error: null }))

  const from = vi.fn((table: string) => {
    if (table === 'resumes') {
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => opts.ownership) })) })) })) }
    }
    if (table === 'ai_analysis_history') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => ({ limit: vi.fn(() => ({ single: vi.fn(async () => opts.cached) })) })) })) })) })) })),
        insert,
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return { supabase: { from }, spies: { insert } }
}

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

describe('POST /api/ai/analyze', () => {
  const originalProvider = process.env.AI_PROVIDER

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AI_PROVIDER = 'openai'
    mockedGetPrompt.mockReturnValue('analysis prompt')
  })

  afterAll(() => {
    process.env.AI_PROVIDER = originalProvider
  })

  it('returns cached result when resume content hash matches', async () => {
    const { supabase } = createSupabaseMock({
      cached: {
        data: {
          output_json: { overall_score: 80, scores: { content_completeness: 80, structure: 80, expression: 80 } },
          created_at: '2026-03-12T00:00:00Z',
          model: 'openai',
        },
        error: null,
      },
    })
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })

    const res = await POST(createRequest({ resumeId: 'resume-1', resumeContent: { summary: 'hello' } }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.is_cached).toBe(true)
    expect(mockedGenerateObject).not.toHaveBeenCalled()
  })

  it('uses OpenAI object generation when cache misses', async () => {
    const { supabase, spies } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-2'),
      supabase: supabase as never,
      response: null,
    })
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        overall_score: 76,
        scores: { content_completeness: 72, structure: 80, expression: 76 },
        content_completeness: { missing_sections: ['项目成果'], recommendations: ['增加量化结果'] },
        structure: { recommendations: ['优化段落层次'] },
        expression: { rewrite_examples: ['将负责改为主导'] },
      },
    } as never)

    const res = await POST(createRequest({ resumeId: 'resume-1', resumeContent: { summary: 'hello' } }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.overall_score).toBe(76)
    expect(spies.insert).toHaveBeenCalledTimes(1)
  })

  it('falls back when deepseek text cannot be parsed', async () => {
    process.env.AI_PROVIDER = 'deepseek'
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-3'),
      supabase: supabase as never,
      response: null,
    })
    mockedGenerateText.mockResolvedValueOnce({ text: 'invalid-json' } as never)

    const res = await POST(createRequest({ resumeId: 'resume-1', resumeContent: { summary: 'hello' }, forceReanalyze: true }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.overall_score).toBe(75)
    expect(body.content_completeness.recommendations).toContain('添加更多量化数据')
  })

  it('returns 400 when resumeContent is missing', async () => {
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-4'),
      supabase: supabase as never,
      response: null,
    })

    const res = await POST(createRequest({}))
    expect(res.status).toBe(400)
  })
})
