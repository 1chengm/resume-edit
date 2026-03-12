import { test, expect } from '@playwright/test'
import { authHeaders, createResumeFixture, deleteResumeFixture, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/resumes/:id/pdf', () => {
  test('POST returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.post('/api/resumes/unknown-id/pdf'), 401)
  })

  test('POST uploads pdf with auth', async ({ request }) => {
    skipWithoutAuth()
    const created = await createResumeFixture(request)
    const resumeId = created.id

    const res = await request.post(`/api/resumes/${resumeId}/pdf`, {
      headers: authHeaders(),
      multipart: {
        file: {
          name: 'resume.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4 e2e test'),
        },
      },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
    await deleteResumeFixture(request, resumeId)
  })
})
