import { createHash } from 'crypto'
import { GET } from '@/app/api/share/[uuid]/route'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

const mockedCreateClient = vi.mocked(createClient)
const mockedCreateSupabaseAdminClient = vi.mocked(createSupabaseAdminClient)

type ResumeRecord = {
  id: string
  user_id: string
  share_permission: 'public' | 'private' | 'password'
  share_password_hash?: string
}

function buildSupabaseMock(options: {
  resume: ResumeRecord | null
  userId?: string | null
  content?: unknown
}) {
  const resumeQuery = {
    select: vi.fn(() => resumeQuery),
    eq: vi.fn(() => resumeQuery),
    single: vi.fn(async () => {
      if (!options.resume) return { data: null, error: { message: 'Not found' } }
      return { data: options.resume, error: null }
    }),
  }

  const contentQuery = {
    select: vi.fn(() => contentQuery),
    eq: vi.fn(() => contentQuery),
    single: vi.fn(async () => ({ data: options.content ?? { content_json: {} }, error: null })),
  }

  const from = vi.fn((table: string) => {
    if (table === 'resumes') return resumeQuery
    if (table === 'resume_content') return contentQuery
    throw new Error(`Unexpected table ${table}`)
  })

  return {
    supabase: {
      from,
      auth: {
        getUser: vi.fn(async () => ({ data: { user: options.userId ? { id: options.userId } : null } })),
      },
    },
  }
}

function buildAdminMock(options: { existingStat?: { id: string; count: number } | null }) {
  const statQuery = {
    select: vi.fn(() => statQuery),
    eq: vi.fn(() => statQuery),
    single: vi.fn(async () => ({ data: options.existingStat ?? null, error: null })),
  }
  const updateChain = {
    eq: vi.fn(async () => ({ error: null })),
  }
  const from = vi.fn(() => ({
    ...statQuery,
    insert: vi.fn(async () => ({ error: null })),
    update: vi.fn(() => updateChain),
  }))

  return {
    admin: { from },
  }
}

describe('GET /api/share/[uuid]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateClient.mockReset()
    mockedCreateSupabaseAdminClient.mockReset()
  })

  it('returns 404 when share uuid does not exist', async () => {
    const { supabase } = buildSupabaseMock({ resume: null })
    mockedCreateClient.mockResolvedValue(supabase as never)
    mockedCreateSupabaseAdminClient.mockReturnValue({ from: vi.fn() } as never)

    const req = new Request('http://localhost/api/share/does-not-exist')
    const res = await GET(req as never, { params: Promise.resolve({ uuid: 'does-not-exist' }) })
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toBe('Not found')
  })

  it('returns 401 for private share when viewer is not owner', async () => {
    const { supabase } = buildSupabaseMock({
      resume: { id: 'r1', user_id: 'owner-1', share_permission: 'private' },
      userId: 'other-user',
    })
    mockedCreateClient.mockResolvedValue(supabase as never)
    mockedCreateSupabaseAdminClient.mockReturnValue({ from: vi.fn() } as never)

    const req = new Request('http://localhost/api/share/private-uuid')
    const res = await GET(req as never, { params: Promise.resolve({ uuid: 'private-uuid' }) })
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 for password share when password is missing or incorrect', async () => {
    const passwordHash = createHash('sha256').update('correct-password').digest('hex')
    const { supabase } = buildSupabaseMock({
      resume: {
        id: 'r2',
        user_id: 'owner-2',
        share_permission: 'password',
        share_password_hash: passwordHash,
      },
    })
    mockedCreateClient.mockResolvedValue(supabase as never)
    mockedCreateSupabaseAdminClient.mockReturnValue({ from: vi.fn() } as never)

    const req = new Request('http://localhost/api/share/password-uuid?password=wrong')
    const res = await GET(req as never, { params: Promise.resolve({ uuid: 'password-uuid' }) })
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Password required')
  })

  it('returns resume content and increments share_view stats for public share', async () => {
    const { supabase } = buildSupabaseMock({
      resume: { id: 'r3', user_id: 'owner-3', share_permission: 'public' },
      content: { content_json: { summary: 'hello' } },
    })
    const { admin } = buildAdminMock({ existingStat: null })
    mockedCreateClient.mockResolvedValue(supabase as never)
    mockedCreateSupabaseAdminClient.mockReturnValue(admin as never)

    const req = new Request('http://localhost/api/share/public-uuid')
    const res = await GET(req as never, { params: Promise.resolve({ uuid: 'public-uuid' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.resume.id).toBe('r3')
    expect(body.content).toBeTruthy()
    expect(admin.from).toHaveBeenCalledWith('resume_stats')
  })
})
