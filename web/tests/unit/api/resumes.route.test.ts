import { NextResponse } from 'next/server'
import { GET, POST } from '@/app/api/resumes/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { mockUser } from './test-helpers'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)

function createSupabaseMock(options?: {
  resumes?: { data: unknown[] | null; error: { message: string } | null }
  insertedResume?: { data: Record<string, unknown> | null; error: { message: string } | null }
  contentInsertError?: { message: string } | null
}) {
  const opts = {
    resumes: { data: [{ id: 'r1' }], error: null } as { data: unknown[] | null; error: { message: string } | null },
    insertedResume: { data: { id: 'r-new', title: 'New Resume' }, error: null } as { data: Record<string, unknown> | null; error: { message: string } | null },
    contentInsertError: null as { message: string } | null,
    ...options,
  }

  const resumesOrder = vi.fn(async () => opts.resumes)
  const resumeInsertSingle = vi.fn(async () => opts.insertedResume)
  const contentInsert = vi.fn(async () => ({ error: opts.contentInsertError }))

  const from = vi.fn((table: string) => {
    if (table === 'resumes') {
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ order: resumesOrder })) })),
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: resumeInsertSingle })) })),
      }
    }
    if (table === 'resume_content') {
      return {
        insert: contentInsert,
      }
    }
    throw new Error(`Unexpected table ${table}`)
  })

  return { supabase: { from }, spies: { resumesOrder, resumeInsertSingle, contentInsert } }
}

describe('API /resumes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns 401 when unauthorized', async () => {
    mockedRequireApiUser.mockResolvedValueOnce({
      user: null,
      supabase: null as never,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('GET returns user resumes ordered by updated_at', async () => {
    const { supabase, spies } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.items).toEqual([{ id: 'r1' }])
    expect(spies.resumesOrder).toHaveBeenCalledWith('updated_at', { ascending: false })
  })

  it('POST creates resume and inserts template content', async () => {
    const { supabase, spies } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-2'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Alice Resume', template: 'Creative', color_theme: '#f5a623' }),
    }) as never

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.id).toBe('r-new')
    expect(spies.contentInsert).toHaveBeenCalledTimes(1)
    const contentInsertCall = (spies.contentInsert.mock.calls as unknown[][])[0]
    expect(contentInsertCall).toBeTruthy()
    expect(contentInsertCall?.[0]).toMatchObject({
      resume_id: 'r-new',
    })
  })

  it('POST returns 500 when resume_content insert fails', async () => {
    const { supabase } = createSupabaseMock({
      contentInsertError: { message: 'content insert failed' },
    })
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-3'),
      supabase: supabase as never,
      response: null,
    })

    const req = new Request('http://localhost/api/resumes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    }) as never

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('content insert failed')
  })
})
