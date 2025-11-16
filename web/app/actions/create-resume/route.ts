import { NextResponse } from 'next/server'
import { cookies as nextCookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function GET(req: Request) {
  const cookieStore = await nextCookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set(name, value, options as any) },
        remove(name: string, options: CookieOptions) { cookieStore.set(name, '', { ...(options as any), maxAge: 0 }) }
      }
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/sign-in', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  const { data, error } = await supabase.from('resumes').insert({ user_id: user.id, title: '未命名简历', template: 'Modern', color_theme: '#2b8cee' }).select('id').single()
  if (error || !data) return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
  await supabase.from('resume_content').insert({ resume_id: data.id, content_json: {} })
  return NextResponse.redirect(new URL(`/resume/${data.id}/edit`, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
}