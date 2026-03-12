import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, deleteResumeFixture, expectJsonError, getResumeFixture, skipWithoutAi, skipWithoutAuth } from './helpers'

test.describe('API /api/ai/analyze', () => {
  test('POST returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.post('/api/ai/analyze'), 401)
  })

  test('POST analyzes resume with auth', async ({ request }) => {
    skipWithoutAuth()
    skipWithoutAi()
    const created = await createResumeFixture(request)
    const resumeData = await getResumeFixture(request, created.id)

    const res = await request.post('/api/ai/analyze', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: { resumeId: created.id, resumeContent: resumeData.content_json },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('overall_score')
    await deleteResumeFixture(request, created.id)
  })
})
