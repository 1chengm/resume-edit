import { NextResponse } from 'next/server'
import { POST } from '@/app/api/resumes/[id]/pdf/route'
import { requireApiUser } from '@/lib/auth/require-user'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)

function createSupabaseMock(options: {
  ownership: { data: { id: string } | null; error: { message: string } | null }
  uploadError?: { message: string } | null
}) {
  const ownershipQuery = {
    select: vi.fn(() => ownershipQuery),
    eq: vi.fn(() => ownershipQuery),
    maybeSingle: vi.fn(async () => options.ownership),
  }

  const upload = vi.fn(async () => ({ error: options.uploadError ?? null }))
  const storageFrom = vi.fn(() => ({ upload }))
  const from = vi.fn((table: string) => {
    if (table === 'resumes') return ownershipQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    supabase: {
      from,
      storage: {
        from: storageFrom,
      },
    },
    spies: {
      from,
      storageFrom,
      upload,
    },
  }
}

describe('POST /api/resumes/[id]/pdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      user: null,
      supabase: null as never,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })

    const req = new Request('http://localhost/api/resumes/r1/pdf', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'r1' }) })
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 404 when resume does not belong to current user', async () => {
    const { supabase } = createSupabaseMock({
      ownership: { data: null, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: { id: 'user-a' } as { id: string },
      supabase: supabase as never,
      response: null,
    })

    const form = new FormData()
    form.append('file', new File(['pdf-content'], 'resume.pdf', { type: 'application/pdf' }))
    const req = new Request('http://localhost/api/resumes/r2/pdf', { method: 'POST', body: form })
    const res = await POST(req, { params: Promise.resolve({ id: 'r2' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Resume not found')
  })

  it('returns 400 for non-pdf upload', async () => {
    const { supabase } = createSupabaseMock({
      ownership: { data: { id: 'r3' }, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: { id: 'user-a' } as { id: string },
      supabase: supabase as never,
      response: null,
    })

    const form = new FormData()
    form.append('file', new File(['not-pdf'], 'resume.txt', { type: 'text/plain' }))
    const req = new Request('http://localhost/api/resumes/r3/pdf', { method: 'POST', body: form })
    const res = await POST(req, { params: Promise.resolve({ id: 'r3' }) })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid file type')
  })

  it('uploads pdf to user-scoped path when ownership is valid', async () => {
    const { supabase, spies } = createSupabaseMock({
      ownership: { data: { id: 'r4' }, error: null },
    })

    mockedRequireApiUser.mockResolvedValueOnce({
      user: { id: 'user-z' } as { id: string },
      supabase: supabase as never,
      response: null,
    })

    const form = new FormData()
    form.append('file', new File(['pdf-content'], 'resume.pdf', { type: 'application/pdf' }))
    const req = new Request('http://localhost/api/resumes/r4/pdf', { method: 'POST', body: form })
    const res = await POST(req, { params: Promise.resolve({ id: 'r4' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.path).toBe('user-z/r4.pdf')
    expect(spies.storageFrom).toHaveBeenCalledWith('resumes')
    expect(spies.upload).toHaveBeenCalledTimes(1)
  })
})
