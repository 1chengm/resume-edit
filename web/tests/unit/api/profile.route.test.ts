import { NextResponse } from 'next/server'
import { GET, POST } from '@/app/api/profile/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { mockUser } from './test-helpers'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)

function createSupabaseMock(options?: {
  getProfile?: { data: Record<string, unknown> | null; error: { message: string; code?: string } | null }
  createProfile?: { data: Record<string, unknown> | null; error: { message: string } | null }
  updateError?: { message: string; code?: string } | null
  insertError?: { message: string } | null
}) {
  const opts = {
    getProfile: { data: { display_name: 'Alice', avatar_url: null }, error: null } as { data: Record<string, unknown> | null; error: { message: string; code?: string } | null },
    createProfile: { data: { display_name: null, avatar_url: null }, error: null } as { data: Record<string, unknown> | null; error: { message: string } | null },
    updateError: null as { message: string; code?: string } | null,
    insertError: null as { message: string } | null,
    ...options,
  }

  const profileSingle = vi.fn(async () => opts.getProfile)
  const createdSingle = vi.fn(async () => opts.createProfile)
  const updateEq = vi.fn(async () => ({ error: opts.updateError }))
  const insert = vi.fn(() => ({ select: vi.fn(() => ({ single: createdSingle })) }))
  const postInsert = vi.fn(async () => ({ error: opts.insertError }))

  const from = vi.fn(() => ({
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single: profileSingle })) })),
    insert,
    update: vi.fn(() => ({ eq: updateEq })),
  }))

  const postFrom = vi.fn(() => ({
    update: vi.fn(() => ({ eq: updateEq })),
    insert: postInsert,
  }))

  return {
    getSupabase: { from },
    postSupabase: { from: postFrom },
    spies: { profileSingle, createdSingle, updateEq, postInsert },
  }
}

describe('API /profile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('GET auto-creates profile when not found', async () => {
    const { getSupabase } = createSupabaseMock({
      getProfile: { data: null, error: { message: 'not found', code: 'PGRST116' } },
    })
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: getSupabase as never,
      response: null,
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ display_name: null, avatar_url: null })
  })

  it('POST rejects invalid display name', async () => {
    const { postSupabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-2'),
      supabase: postSupabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'a' }),
    }) as never

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('POST inserts profile when update returns missing row', async () => {
    const { postSupabase, spies } = createSupabaseMock({
      updateError: { message: 'missing', code: 'PGRST116' },
    })
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-3'),
      supabase: postSupabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ display_name: 'Alice Zhang' }),
    }) as never

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(spies.postInsert).toHaveBeenCalledTimes(1)
  })
})
