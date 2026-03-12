import { NextResponse } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/resumes/[id]/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { revalidateTag } from 'next/cache'
import { mockUser } from './test-helpers'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)
const mockedRevalidateTag = vi.mocked(revalidateTag)

type QueryResult<T> = { data: T | null; error: { message: string } | null }

function createSupabaseMock(options?: {
  resumeMaybeSingle?: QueryResult<Record<string, unknown>>
  contentMaybeSingle?: QueryResult<{ content_json?: Record<string, unknown> }>
  resumeUpdateError?: { message: string } | null
  resumeDeleteError?: { message: string } | null
}) {
  const opts = {
    resumeMaybeSingle: { data: null, error: null } as QueryResult<Record<string, unknown>>,
    contentMaybeSingle: { data: { content_json: {} }, error: null } as QueryResult<{ content_json?: Record<string, unknown> }>,
    resumeUpdateError: null as { message: string } | null,
    resumeDeleteError: null as { message: string } | null,
    ...options,
  }

  const resumesMaybeSingle = vi.fn(async () => opts.resumeMaybeSingle)
  const contentMaybeSingle = vi.fn(async () => opts.contentMaybeSingle)
  const contentDeleteEq = vi.fn(() => Promise.resolve({ error: null }))
  const resumeUpdateEqUserId = vi.fn(() => Promise.resolve({ error: opts.resumeUpdateError }))
  const resumeDeleteEqUserId = vi.fn(() => Promise.resolve({ error: opts.resumeDeleteError }))

  const resumesEqUserIdChain = { maybeSingle: resumesMaybeSingle }
  const resumesEqIdChain = { eq: vi.fn(() => resumesEqUserIdChain) }
  const resumesSelectChain = { eq: vi.fn(() => resumesEqIdChain) }

  const resumesUpdateEqIdChain = { eq: resumeUpdateEqUserId }
  const resumesUpdateChain = { eq: vi.fn(() => resumesUpdateEqIdChain) }

  const resumesDeleteEqIdChain = { eq: resumeDeleteEqUserId }
  const resumesDeleteChain = { eq: vi.fn(() => resumesDeleteEqIdChain) }

  const contentEqChain = { maybeSingle: contentMaybeSingle, single: vi.fn(async () => ({ data: null, error: { message: 'not implemented' } })) }
  const contentSelectChain = { eq: vi.fn(() => contentEqChain) }
  const contentDeleteChain = { eq: contentDeleteEq }

  const from = vi.fn((table: string) => {
    if (table === 'resumes') {
      return {
        select: vi.fn(() => resumesSelectChain),
        update: vi.fn(() => resumesUpdateChain),
        delete: vi.fn(() => resumesDeleteChain),
      }
    }

    if (table === 'resume_content') {
      return {
        select: vi.fn(() => contentSelectChain),
        delete: vi.fn(() => contentDeleteChain),
      }
    }

    if (table === 'resume_content_versions') {
      return {
        insert: vi.fn(async () => ({ error: null })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })) })),
        delete: vi.fn(() => ({ in: vi.fn(async () => ({ error: null })) })),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    supabase: { from },
    spies: {
      from,
      resumesMaybeSingle,
      contentMaybeSingle,
      contentDeleteEq,
      resumeUpdateEqUserId,
      resumeDeleteEqUserId,
    },
  }
}

describe('API /resumes/[id] authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedRevalidateTag.mockReset()
  })

  it('GET returns 401 when not authenticated', async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      user: null,
      supabase: null as never,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const req = new Request('http://localhost/api/resumes/r1') as never
    const res = await GET(req, { params: Promise.resolve({ id: 'r1' }) })
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('GET returns 404 when resume does not belong to user', async () => {
    const { supabase } = createSupabaseMock({
      resumeMaybeSingle: { data: null, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-a'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes/r2') as never
    const res = await GET(req, { params: Promise.resolve({ id: 'r2' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Resume not found')
  })

  it('GET returns combined resume + content when owned', async () => {
    const { supabase } = createSupabaseMock({
      resumeMaybeSingle: {
        data: { id: 'r3', title: 'My Resume', template: 'Modern', color_theme: '#000', updated_at: '2026-01-01' },
        error: null,
      },
      contentMaybeSingle: {
        data: { content_json: { summary: 'hello' } },
        error: null,
      },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-a'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes/r3') as never
    const res = await GET(req, { params: Promise.resolve({ id: 'r3' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe('r3')
    expect(body.content_json).toEqual({ summary: 'hello' })
  })

  it('PATCH returns 404 when resume ownership check fails', async () => {
    const { supabase } = createSupabaseMock({
      resumeMaybeSingle: { data: null, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-a'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes/r4', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'new-title' }),
      headers: { 'content-type': 'application/json' },
    }) as never
    const res = await PATCH(req, { params: Promise.resolve({ id: 'r4' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Resume not found')
  })

  it('PATCH updates metadata using user_id constraint when owned', async () => {
    const { supabase, spies } = createSupabaseMock({
      resumeMaybeSingle: { data: { id: 'r5', share_uuid: 'share-r5' }, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-z'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes/r5', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Updated' }),
      headers: { 'content-type': 'application/json' },
    }) as never
    const res = await PATCH(req, { params: Promise.resolve({ id: 'r5' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(spies.resumeUpdateEqUserId).toHaveBeenCalledWith('user_id', 'user-z')
    expect(mockedRevalidateTag).toHaveBeenCalledWith('share:share-r5', 'max')
  })

  it('DELETE returns 404 when resume ownership check fails', async () => {
    const { supabase } = createSupabaseMock({
      resumeMaybeSingle: { data: null, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-a'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes/r6', { method: 'DELETE' }) as never
    const res = await DELETE(req, { params: Promise.resolve({ id: 'r6' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Resume not found')
  })

  it('DELETE removes resume content and resume for owned record', async () => {
    const { supabase, spies } = createSupabaseMock({
      resumeMaybeSingle: { data: { id: 'r7', share_uuid: 'share-r7' }, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('owner-7'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes/r7', { method: 'DELETE' }) as never
    const res = await DELETE(req, { params: Promise.resolve({ id: 'r7' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(spies.contentDeleteEq).toHaveBeenCalledWith('resume_id', 'r7')
    expect(spies.resumeDeleteEqUserId).toHaveBeenCalledWith('user_id', 'owner-7')
    expect(mockedRevalidateTag).toHaveBeenCalledWith('share:share-r7', 'max')
  })
})
