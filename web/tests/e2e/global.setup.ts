import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

type AuthState = {
  email: string
  password: string
  accessToken: string
}

function loadLocalEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const raw = fs.readFileSync(envPath, 'utf-8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    const key = trimmed.slice(0, index)
    const value = trimmed.slice(index + 1)
    if (!process.env[key]) process.env[key] = value
  }
}

export default async function globalSetup() {
  loadLocalEnv()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) {
    return
  }

  const email = process.env.E2E_EMAIL || 'e2e-resume-edit-pdf@example.com'
  const password = process.env.E2E_PASSWORD || 'E2E-Password-2026!'

  const admin = createClient(url, serviceRoleKey)
  const publicClient = createClient(url, anonKey)

  const listed = await admin.auth.admin.listUsers()
  const existing = listed.data?.users.find((user) => user.email === email)

  if (!existing) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (created.error) {
      throw created.error
    }
  } else {
    const updated = await admin.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
    })
    if (updated.error) {
      throw updated.error
    }
  }

  const signedIn = await publicClient.auth.signInWithPassword({ email, password })
  if (signedIn.error || !signedIn.data.session?.access_token) {
    throw signedIn.error || new Error('Failed to sign in e2e user')
  }

  const authDir = path.join(process.cwd(), 'tests', '.auth')
  fs.mkdirSync(authDir, { recursive: true })

  const authState: AuthState = {
    email,
    password,
    accessToken: signedIn.data.session.access_token,
  }

  fs.writeFileSync(path.join(authDir, 'e2e-user.json'), JSON.stringify(authState, null, 2))
}
