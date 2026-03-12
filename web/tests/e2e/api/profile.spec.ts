import { test, expect } from '@playwright/test'
import { authHeaders, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/profile', () => {
  test('GET returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.get('/api/profile'), 401)
  })

  test('GET and POST work with auth', async ({ request }) => {
    skipWithoutAuth()
    const getRes = await request.get('/api/profile', { headers: authHeaders() })
    expect(getRes.ok()).toBeTruthy()

    const postRes = await request.post('/api/profile', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      data: { display_name: `E2E User ${Date.now()}` },
    })
    expect(postRes.ok()).toBeTruthy()
  })
})
