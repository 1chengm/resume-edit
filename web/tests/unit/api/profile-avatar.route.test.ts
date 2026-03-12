import { NextResponse } from 'next/server'
import { POST } from '@/app/api/profile/avatar/route'
import { requireApiUser } from '@/lib/auth/require-user'
import { mockUser } from './test-helpers'

vi.mock('@/lib/auth/require-user', () => ({
  requireApiUser: vi.fn(),
}))

const mockedRequireApiUser = vi.mocked(requireApiUser)

function createSupabaseMock(options?: {
  uploadError?: { message: string; error?: string; statusCode?: string } | null
  updateError?: { message: string; code?: string } | null
  insertError?: { message: string } | null
}) {
  const opts = {
    uploadError: null as { message: string; error?: string; statusCode?: string } | null,
    updateError: null as { message: string; code?: string } | null,
    insertError: null as { message: string } | null,
    ...options,
  }

  const upload = vi.fn(async () => ({ data: { path: 'user-1/avatar.png' }, error: opts.uploadError }))
  const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://cdn.example.com/avatar.png' } }))
  const updateEq = vi.fn(async () => ({ error: opts.updateError }))
  const insert = vi.fn(async () => ({ error: opts.insertError }))

  return {
    supabase: {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq: updateEq })),
        insert,
      })),
      storage: {
        from: vi.fn(() => ({ upload, getPublicUrl })),
      },
    },
    spies: { upload, getPublicUrl, updateEq, insert },
  }
}

describe('POST /api/profile/avatar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 for invalid file type', async () => {
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })

    const form = new FormData()
    form.append('file', new File(['abc'], 'avatar.gif', { type: 'image/gif' }))
    const req = new Request('http://localhost/api/profile/avatar', { method: 'POST', body: form }) as never
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when file is too large', async () => {
    const { supabase } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })

    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'avatar.png', { type: 'image/png' })
    const form = new FormData()
    form.append('file', file)
    const req = new Request('http://localhost/api/profile/avatar', { method: 'POST', body: form }) as never
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('uploads avatar and updates profile', async () => {
    const { supabase, spies } = createSupabaseMock()
    mockedRequireApiUser.mockResolvedValueOnce({
      user: mockUser('user-1'),
      supabase: supabase as never,
      response: null,
    })

    const form = new FormData()
    form.append('file', new File(['abc'], 'avatar.png', { type: 'image/png' }))
    const req = new Request('http://localhost/api/profile/avatar', { method: 'POST', body: form }) as never
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(spies.upload).toHaveBeenCalledTimes(1)
    expect(spies.getPublicUrl).toHaveBeenCalledTimes(1)
  })
})
