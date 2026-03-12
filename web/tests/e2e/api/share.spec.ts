import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, deleteResumeFixture, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/share', () => {
  test('POST returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.post('/api/share'), 401)
  })

  test('POST creates share link with auth', async ({ request }) => {
    skipWithoutAuth()
    const created = await createResumeFixture(request)
    const resumeId = created.id

    const res = await request.post('/api/share', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: { resume_id: resumeId, permission: 'public' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.share_uuid).toBeTruthy()
    await deleteResumeFixture(request, resumeId)
  })
})
