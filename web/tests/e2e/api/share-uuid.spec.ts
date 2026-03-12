import { test, expect } from '@playwright/test'
import { createResumeFixture, createShareFixture, deleteResumeFixture, skipWithoutAuth } from './helpers'

test.describe('API /api/share/:uuid', () => {
  test('GET public share works with auto-created share uuid', async ({ request }) => {
    skipWithoutAuth()
    const created = await createResumeFixture(request)
    const share = await createShareFixture(request, created.id, 'public')

    const res = await request.get(`/api/share/${share.share_uuid}`)
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.resume).toBeTruthy()
    expect(body.content).toBeTruthy()
    await deleteResumeFixture(request, created.id)
  })

  test('GET protected share rejects wrong password', async ({ request }) => {
    skipWithoutAuth()
    const created = await createResumeFixture(request)
    const share = await createShareFixture(request, created.id, 'password', 'correct-password')

    const res = await request.get(`/api/share/${share.share_uuid}?password=wrong-password`)
    expect(res.status()).toBe(403)
    await deleteResumeFixture(request, created.id)
  })
})
