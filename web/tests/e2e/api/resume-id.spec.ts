import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/resumes/:id', () => {
  test('GET returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.get('/api/resumes/unknown-id'), 401)
  })

  test('GET/PATCH/DELETE smoke with auth and fixture id', async ({ request }) => {
    skipWithoutAuth()
    const created = await createResumeFixture(request)
    const resumeId = created.id

    const getRes = await request.get(`/api/resumes/${resumeId}`, { headers: authHeaders() })
    expect(getRes.ok()).toBeTruthy()

    const patchRes = await request.patch(`/api/resumes/${resumeId}`, {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: { title: `Updated ${Date.now()}` },
    })
    expect(patchRes.ok()).toBeTruthy()

    const deleteRes = await request.delete(`/api/resumes/${resumeId}`, { headers: authHeaders() })
    expect(deleteRes.ok()).toBeTruthy()
  })
})
