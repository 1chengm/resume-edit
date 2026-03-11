import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  const { data, error } = await supabase.from('resumes').insert({ user_id: user.id, title: '未命名简历', template: 'Modern', color_theme: '#2b8cee' }).select('id').single()
  if (error || !data) return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  await supabase.from('resume_content').insert({ resume_id: data.id, content_json: {} })
  return NextResponse.redirect(new URL(`/resume/${data.id}/edit`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}
