import { NextResponse } from 'next/server'
import { POST } from '@/app/api/ai/jd-match/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { generateObject, generateText } from 'ai'
import { getPrompt } from '@/lib/yaml-prompts'
import { parseChineseJSON } from '@/lib/chinese-key-mapper'
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

vi.mock('@/lib/chinese-key-mapper', () => ({
  parseChineseJSON: vi.fn(),
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
const mockedParseChineseJSON = vi.mocked(parseChineseJSON)

type QueryResult<T> = { data: T | null; error: { message: string } | null }

function createSupabaseMock(options?: {
  ownership?: QueryResult<{ id: string }>
  cachedMatch?: QueryResult<{ output_json: Record<string, unknown>; created_at: string; model: string }>
  insertError?: { message: string } | null
}) {
  const opts = {
    ownership: { data: { id: 'resume-1' }, error: null } as QueryResult<{ id: string }>,
    cachedMatch: { data: null, error: { message: 'not found' } } as QueryResult<{ output_json: Record<string, unknown>; created_at: string; model: string }>,
    insertError: null as { message: string } | null,
    ...options,
  }

  const ownershipSingle = vi.fn(async () => opts.ownership)
  const historySingle = vi.fn(async () => opts.cachedMatch)
  const insert = vi.fn(async () => ({ error: opts.insertError }))

  const historyLimit = { single: historySingle }
  const historyOrder = { limit: vi.fn(() => historyLimit) }
  const historyEqHash = { order: vi.fn(() => historyOrder) }
  const historyEqType = { eq: vi.fn(() => historyEqHash) }
  const historyEqResumeId = { eq: vi.fn(() => historyEqType) }

  const resumesEqUserId = { single: ownershipSingle }
  const resumesEqId = { eq: vi.fn(() => resumesEqUserId) }

  const from = vi.fn((table: string) => {
    if (table === 'resumes') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => resumesEqId) })),
      }
    }

    if (table === 'ai_analysis_history') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => historyEqResumeId) })),
        insert,
      }
    }

    throw new Error(`Unexpected table ${table}`)
  })

  return {
    supabase: { from },
    spies: { from, ownershipSingle, historySingle, insert },
  }
}

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ai/jd-match', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

describe('POST /api/ai/jd-match', () => {
  const originalProvider = process.env.AI_PROVIDER

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.AI_PROVIDER = 'openai'
    mockedGetPrompt.mockReturnValue('jd prompt')
  })

  afterAll(() => {
    process.env.AI_PROVIDER = originalProvider
  })

  it('returns 401 when user is not authenticated', async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      user: null,
      supabase: null as never,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const res = await POST(createRequest({}))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 400 when jdText is missing', async () => {
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })

    const res = await POST(createRequest({ resumeContent: { summary: 'test' }, jdText: '   ' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Missing jdText')
  })

  it('returns cached match result when same jd and resume were analyzed before', async () => {
    const { supabase } = createSupabaseMock({
      cachedMatch: {
        data: {
          output_json: { match_score: 88, strengths: ['React'], gaps: [], recommendations: ['强调项目结果'] },
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

    const res = await POST(createRequest({
      resumeId: 'resume-1',
      resumeContent: { personal: { full_name: 'Alice' }, summary: 'Built dashboards' },
      jdText: 'Need React and product analytics experience',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.match_score).toBe(88)
    expect(body.is_cached).toBe(true)
    expect(mockedGenerateObject).not.toHaveBeenCalled()
    expect(mockedGenerateText).not.toHaveBeenCalled()
  })

  it('calls OpenAI structured generation and stores result when cache misses', async () => {
    const { supabase, spies } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-2'),
      supabase: supabase as never,
      response: null,
    })
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        match_score: 79,
        strengths: ['TypeScript', 'Design System'],
        gaps: ['SQL'],
        recommendations: ['补充数据分析相关成果'],
      },
    } as never)

    const res = await POST(createRequest({
      resumeId: 'resume-1',
      resumeContent: { personal: { full_name: 'Bob' }, summary: 'Frontend engineer' },
      jdText: 'Looking for TypeScript, SQL and design systems',
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.match_score).toBe(79)
    expect(mockedGenerateObject).toHaveBeenCalledTimes(1)
    expect(spies.insert).toHaveBeenCalledTimes(1)
    const insertCall = (spies.insert.mock.calls as unknown[][])[0]
    expect(insertCall).toBeTruthy()
    const insertPayload = (insertCall?.[0] ?? {}) as Record<string, unknown>
    expect(insertPayload).toMatchObject({
      resume_id: 'resume-1',
      type: 'jd',
      model: 'openai',
      output_json: {
        match_score: 79,
        strengths: ['TypeScript', 'Design System'],
        gaps: ['SQL'],
        recommendations: ['补充数据分析相关成果'],
      },
    })
  })

  it('uses DeepSeek text generation and chinese-key normalization when provider is deepseek', async () => {
    process.env.AI_PROVIDER = 'deepseek'
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-3'),
      supabase: supabase as never,
      response: null,
    })
    mockedGenerateText.mockResolvedValueOnce({ text: '{"匹配得分":85}' } as never)
    mockedParseChineseJSON.mockReturnValueOnce({
      match_score: 85,
      strengths: ['Vue'],
      gaps: ['A/B Testing'],
      recommendations: ['补充增长实验案例'],
    })

    const res = await POST(createRequest({
      resumeId: 'resume-1',
      resumeContent: { summary: 'Growth focused frontend engineer' },
      jdText: 'Need Vue and growth experimentation',
      forceRematch: true,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.match_score).toBe(85)
    expect(mockedGenerateText).toHaveBeenCalledTimes(1)
    expect(mockedParseChineseJSON).toHaveBeenCalledWith('{"匹配得分":85}')
  })
})
