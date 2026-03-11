import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/require-user'

type FileLike = {
  arrayBuffer: () => Promise<ArrayBuffer>
  type: string
  size: number
}

function isFileLike(value: unknown): value is FileLike {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<FileLike>
  return (
    typeof candidate.arrayBuffer === 'function' &&
    typeof candidate.type === 'string' &&
    typeof candidate.size === 'number'
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, supabase, response } = await requireApiUser()
  if (response) return response
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { data: resume, error: ownershipError } = await supabase
    .from('resumes')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (ownershipError) {
    return NextResponse.json({ error: ownershipError.message }, { status: 500 })
  }
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!isFileLike(file)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Invalid file type, only PDF allowed' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large, max 10MB' }, { status: 400 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const path = `${user.id}/${id}.pdf`
  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(path, bytes, {
      contentType: 'application/pdf',
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, path })
}
