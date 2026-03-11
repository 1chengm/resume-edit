import { NextResponse } from 'next/server'
import { POST } from '@/app/api/share/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { updateTag } from 'next/cache'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

vi.mock('next/cache', () => ({
  updateTag: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)
const mockedUpdateTag = vi.mocked(updateTag)

function createSupabaseMock(options?: {
  ownedResume?: { id: string; share_uuid?: string | null } | null
  ownershipError?: { message: string } | null
  updateError?: { message: string } | null
}) {
  const opts = {
    ownedResume: { id: 'r1', share_uuid: 'old-share-uuid' } as { id: string; share_uuid?: string | null } | null,
    ownershipError: null as { message: string } | null,
    updateError: null as { message: string } | null,
    ...options,
  }

  const maybeSingle = vi.fn(async () => ({
    data: opts.ownedResume,
    error: opts.ownershipError,
  }))
  const updateEqUserId = vi.fn(async () => ({ error: opts.updateError }))

  const resumesSelectEqUserId = { maybeSingle }
  const resumesSelectEqId = { eq: vi.fn(() => resumesSelectEqUserId) }
  const resumesSelect = { eq: vi.fn(() => resumesSelectEqId) }

  const resumesUpdateEqId = { eq: updateEqUserId }
  const resumesUpdate = { eq: vi.fn(() => resumesUpdateEqId) }

  const from = vi.fn((table: string) => {
    if (table !== 'resumes') throw new Error(`Unexpected table ${table}`)
    return {
      select: vi.fn(() => resumesSelect),
      update: vi.fn(() => resumesUpdate),
    }
  })

  return {
    supabase: { from },
  }
}

describe('POST /api/share', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUpdateTag.mockReset()
  })

  it('returns 401 when unauthorized', async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      user: null,
      supabase: null as never,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const req = new Request('http://localhost/api/share', {
      method: 'POST',
      body: JSON.stringify({ permission: 'public' }),
      headers: { 'content-type': 'application/json' },
    }) as never
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('invalidates old and new share tags when updating share uuid', async () => {
    const { supabase } = createSupabaseMock({
      ownedResume: { id: 'r2', share_uuid: 'old-share-uuid' },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: { id: 'user-2' } as { id: string },
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/share', {
      method: 'POST',
      body: JSON.stringify({ permission: 'public', resume_id: 'r2' }),
      headers: { 'content-type': 'application/json' },
    }) as never
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.share_uuid).toBeTruthy()
    expect(mockedUpdateTag).toHaveBeenCalledWith('share:old-share-uuid')
    expect(mockedUpdateTag).toHaveBeenCalledWith(`share:${body.share_uuid}`)
  })
})
