import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, deleteResumeFixture, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/resumes', () => {
  test('GET returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.get('/api/resumes'), 401)
  })

  test('GET lists resumes with auth', async ({ request }) => {
    skipWithoutAuth()
    const res = await request.get('/api/resumes', { headers: authHeaders() })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(Array.isArray(body.items)).toBeTruthy()
  })

  test('POST creates resume with auth', async ({ request }) => {
    skipWithoutAuth()
    const body = await createResumeFixture(request)
    expect(body.title || '').toContain('E2E Resume')
    await deleteResumeFixture(request, body.id)
  })
})
