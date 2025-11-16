import { NextResponse, NextRequest } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequest } from '@/lib/api-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  // 首先进行认证检查
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const permission = body.permission || 'public'
  const resume_id = body.resume_id
  const password = body.password as string | undefined
  const uuid = randomUUID()
  if (!resume_id) return NextResponse.json({ error: 'Missing resume_id' }, { status: 400 })

  // 使用简单客户端
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get('authorization') || '' } }
  })

  const payload: { share_uuid: string; share_permission: string; share_password_hash?: string } = {
    share_uuid: uuid,
    share_permission: permission
  }
  if (permission === 'password' && password) {
    const hash = createHash('sha256').update(password).digest('hex')
    payload.share_password_hash = hash
  }

  const { error } = await supabase.from('resumes').update(payload).eq('id', resume_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ share_uuid: uuid, permission })
}