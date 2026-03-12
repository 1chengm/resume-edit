import { NextResponse } from 'next/server'
import { POST } from '@/app/api/stats/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { mockUser } from './test-helpers'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)

function createSupabaseMock(options?: {
  ownedResume?: { data: { id: string } | null; error: { message: string } | null }
  existingStat?: { data: { id: string; count: number } | null }
}) {
  const opts = {
    ownedResume: { data: { id: 'resume-1' }, error: null } as { data: { id: string } | null; error: { message: string } | null },
    existingStat: { data: null } as { data: { id: string; count: number } | null },
    ...options,
  }

  const insert = vi.fn(async () => ({ error: null }))
  const updateEq = vi.fn(async () => ({ error: null }))

  const from = vi.fn((table: string) => {
    if (table === 'resumes') {
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => opts.ownedResume) })) })) })) }
    }
    if (table === 'resume_stats') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => opts.existingStat) })) })) })),
        insert,
        update: vi.fn(() => ({ eq: updateEq })),
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return { supabase: { from }, spies: { insert, updateEq } }
}

describe('POST /api/stats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when required fields are missing', async () => {
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'share_view' }),
    }) as never
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('inserts stat row when no previous stat exists', async () => {
    const { supabase, spies } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-2'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'share_view', resume_id: 'resume-1' }),
    }) as never

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(spies.insert).toHaveBeenCalledTimes(1)
  })

  it('updates count when stat row already exists', async () => {
    const { supabase, spies } = createSupabaseMock({
      existingStat: { data: { id: 'stat-1', count: 3 } },
    })
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-3'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/stats', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'pdf_download', resume_id: 'resume-1' }),
    }) as never

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(spies.updateEq).toHaveBeenCalledWith('id', 'stat-1')
  })
})
