import { test, expect } from '@playwright/test'
import { authHeaders, expectJsonError, skipWithoutAuth } from './helpers'

test.describe('API /api/profile/avatar', () => {
  test('POST returns 401 without auth', async ({ request }) => {
    await expectJsonError(await request.post('/api/profile/avatar'), 401)
  })

  test('POST uploads avatar with auth', async ({ request }) => {
    skipWithoutAuth()
    const res = await request.post('/api/profile/avatar', {
      headers: authHeaders(),
      multipart: {
        file: {
          name: 'avatar.png',
          mimeType: 'image/png',
          buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        },
      },
    })
    expect(res.ok()).toBeTruthy()
  })
})
