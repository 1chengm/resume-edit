import { NextResponse, NextRequest } from 'next/server'
import { randomUUID, createHash } from 'crypto'
import { updateTag } from 'next/cache'
import { requireApiUser } from '@/lib/auth/require-user'

export async function POST(req: NextRequest) {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const permission = body.permission || 'public'
  const resume_id = body.resume_id
  const password = body.password as string | undefined
  const uuid = randomUUID()
  if (!resume_id) return NextResponse.json({ error: 'Missing resume_id' }, { status: 400 })
  if (!['public', 'private', 'password'].includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission value' }, { status: 400 })
  }

  const payload: { share_uuid: string; share_permission: string; share_password_hash?: string } = {
    share_uuid: uuid,
    share_permission: permission
  }
  if (permission === 'password' && password) {
    const hash = createHash('sha256').update(password).digest('hex')
    payload.share_password_hash = hash
  }

  const { data: ownedResume, error: ownershipError } = await supabase
    .from('resumes')
    .select('id,share_uuid')
    .eq('id', resume_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (ownershipError) {
    return NextResponse.json({ error: ownershipError.message }, { status: 500 })
  }
  if (!ownedResume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('resumes')
    .update(payload)
    .eq('id', resume_id)
    .eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ownedResume.share_uuid) {
    updateTag(`share:${ownedResume.share_uuid}`)
  }
  updateTag(`share:${uuid}`)

  return NextResponse.json({ share_uuid: uuid, permission })
}
