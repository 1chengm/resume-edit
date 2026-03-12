import { expect, Page, APIRequestContext, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { authHeaders, createResumeFixture, deleteResumeFixture, getEnv, getResumeFixture, skipWithoutAi, skipWithoutAuth, skipWithoutUiAuth } from '../api/helpers'

export { skipWithoutAi, skipWithoutAuth, skipWithoutUiAuth, authHeaders, createResumeFixture, deleteResumeFixture, getResumeFixture }

function readAuthState() {
  const authFile = path.join(process.cwd(), 'tests', '.auth', 'e2e-user.json')
  if (!fs.existsSync(authFile)) return null
  try {
    return JSON.parse(fs.readFileSync(authFile, 'utf-8')) as { email?: string; password?: string }
  } catch {
    return null
  }
}

export async function loginWithUi(page: Page) {
  const auth = readAuthState()
  const email = getEnv('E2E_EMAIL') || auth?.email || ''
  const password = getEnv('E2E_PASSWORD') || auth?.password || ''
  test.skip(!(email && password), 'Requires E2E_EMAIL and E2E_PASSWORD')

  await page.goto('/sign-in')
  if (page.url().includes('/dashboard')) return

  await page.getByPlaceholder('name@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 20000 })
}

export async function seedResume(request: APIRequestContext) {
  const created = await createResumeFixture(request)
  const detail = await getResumeFixture(request, created.id)
  return { ...created, content_json: detail.content_json }
}

export async function cleanupResume(request: APIRequestContext, resumeId: string) {
  await deleteResumeFixture(request, resumeId)
}

export async function expectEditorShell(page: Page) {
  await expect(page.getByRole('heading', { name: 'Resume Editor' })).toBeVisible()
  await expect(page.getByText('边编辑，边看最终版式')).toBeVisible()
}
