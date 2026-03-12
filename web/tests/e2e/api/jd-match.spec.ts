import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, deleteResumeFixture, expectJsonError, getResumeFixture, skipWithoutAi, skipWithoutAuth } from './helpers'

test.describe('API /api/ai/jd-match', () => {
  test('POST returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.post('/api/ai/jd-match'), 401)
  })

  test('POST matches resume with JD using auth', async ({ request }) => {
    skipWithoutAuth()
    skipWithoutAi()
    const created = await createResumeFixture(request)
    const resumeData = await getResumeFixture(request, created.id)

    const res = await request.post('/api/ai/jd-match', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: {
        resumeId: created.id,
        resumeContent: resumeData.content_json,
        jdText: 'Need React, TypeScript, performance optimization and design system collaboration.',
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('match_score')
    await deleteResumeFixture(request, created.id)
  })
})
