import { NextResponse, NextRequest } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // 使用统一的服务端客户端
  const supabase = await createClient()

  // 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const permission = body.permission || 'public'
  const resume_id = body.resume_id
  const password = body.password as string | undefined
  const uuid = randomUUID()
  if (!resume_id) return NextResponse.json({ error: 'Missing resume_id' }, { status: 400 })

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