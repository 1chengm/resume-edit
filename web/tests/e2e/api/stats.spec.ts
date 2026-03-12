import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, deleteResumeFixture, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/stats', () => {
  test('POST returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.post('/api/stats'), 401)
  })

  test('POST records a stat with auth', async ({ request }) => {
    skipWithoutAuth()
    const created = await createResumeFixture(request)
    const resumeId = created.id

    const res = await request.post('/api/stats', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: { type: 'share_view', resume_id: resumeId },
    })
    expect(res.ok()).toBeTruthy()
    await deleteResumeFixture(request, resumeId)
  })
})
