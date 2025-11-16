import { NextResponse, NextRequest } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { createAuthenticatedClient } from '@/lib/api-client'

export async function POST(req: NextRequest) {
  const { user, error: authError } = await authenticateRequest(req)
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAuthenticatedClient(req)

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'File too large' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const path = `${user.id}/avatar.${file.type.includes('png') ? 'png' : 'jpg'}`
  const { error: upErr } = await supabase.storage.from('avatars').upload(path, new Uint8Array(arrayBuffer), { contentType: file.type, upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatar_url = pub?.publicUrl || path
  await supabase.from('profiles').upsert({ user_id: user.id, avatar_url }).eq('user_id', user.id)
  return NextResponse.json({ ok: true, avatar_url })
}