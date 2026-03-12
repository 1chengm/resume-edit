import { expect, test, APIRequestContext } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

export function getEnv(name: string) {
  return process.env[name] || ''
}

function readAuthState() {
  const authFile = path.join(process.cwd(), 'tests', '.auth', 'e2e-user.json')
  if (!fs.existsSync(authFile)) return null
  try {
    return JSON.parse(fs.readFileSync(authFile, 'utf-8')) as {
      email?: string
      password?: string
      accessToken?: string
    }
  } catch {
    return null
  }
}

export function authHeaders() {
  const headers: Record<string, string> = {}
  const token = getEnv('E2E_AUTH_TOKEN') || readAuthState()?.accessToken || ''
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function expectJsonError(response: Awaited<ReturnType<APIRequestContext['get']>>, status: number) {
  expect(response.status()).toBe(status)
  const body = await response.json()
  expect(body).toHaveProperty('error')
}

export function skipWithoutAuth() {
  test.skip(!authHeaders().Authorization, 'Requires E2E auth setup')
}

export function skipWithoutAi() {
  const hasAi = Boolean(getEnv('OPENAI_API_KEY') || getEnv('DEEPSEEK_API_KEY'))
  test.skip(!hasAi, 'Requires OPENAI_API_KEY or DEEPSEEK_API_KEY')
}

export function skipWithoutUiAuth() {
  const auth = readAuthState()
  test.skip(!(getEnv('E2E_EMAIL') || auth?.email) || !(getEnv('E2E_PASSWORD') || auth?.password), 'Requires E2E UI auth setup')
}

export async function createResumeFixture(request: APIRequestContext, overrides?: Record<string, unknown>) {
  const res = await request.post('/api/resumes', {
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    data: {
      title: `E2E Resume ${Date.now()}`,
      template: 'Modern',
      color_theme: '#2b8cee',
      ...overrides,
    },
  })
  expect(res.ok()).toBeTruthy()
  return res.json() as Promise<{ id: string; title: string }>
}

export async function deleteResumeFixture(request: APIRequestContext, resumeId: string) {
  await request.delete(`/api/resumes/${resumeId}`, {
    headers: authHeaders(),
  })
}

export async function getResumeFixture(request: APIRequestContext, resumeId: string) {
  const res = await request.get(`/api/resumes/${resumeId}`, { headers: authHeaders() })
  expect(res.ok()).toBeTruthy()
  return res.json() as Promise<{ id: string; title: string; content_json: Record<string, unknown> }>
}

export async function createShareFixture(request: APIRequestContext, resumeId: string, permission: 'public' | 'password' = 'public', password?: string) {
  const res = await request.post('/api/share', {
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    data: { resume_id: resumeId, permission, password },
  })
  expect(res.ok()).toBeTruthy()
  return res.json() as Promise<{ share_uuid: string }>
}
