import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 定义需要认证的路径
  const protectedPaths = ['/dashboard', '/profile', '/resumes', '/settings']
  const authPaths = ['/sign-in', '/sign-up', '/auth/auth-code-error']
  
  // 检查当前路径是否需要认证
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isAuthPath = authPaths.some(path => pathname.startsWith(path))
  
  // 创建 Supabase 客户端
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    // 获取当前用户会话
    const { data: { session }, error } = await supabase.auth.getSession()
    
    // 处理认证错误
    if (error) {
      console.error('Auth error in middleware:', error)
      
      // 如果是受保护路径且有认证错误，重定向到登录页
      if (isProtectedPath) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
      
      return NextResponse.next()
    }

    // 检查用户是否已认证
    const isAuthenticated = !!session?.user

    // 如果用户已认证但访问认证页面，重定向到dashboard
    if (isAuthenticated && isAuthPath && pathname !== '/auth/auth-code-error') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 如果用户未认证但访问受保护路径，重定向到登录页
    if (!isAuthenticated && isProtectedPath) {
      // 保存原始URL以便登录后重定向回来
      const response = NextResponse.redirect(new URL('/sign-in', request.url))
      response.cookies.set('redirectAfterAuth', pathname, { 
        maxAge: 60 * 5, // 5分钟
        httpOnly: true 
      })
      return response
    }

    // 处理 auth-code-error 页面的特殊情况
    if (pathname === '/auth/auth-code-error') {
      // 检查URL中是否有access_token
      const url = new URL(request.url)
      const hasAccessToken = url.searchParams.has('access_token') || 
                            url.hash.includes('access_token')
      
      if (hasAccessToken && isAuthenticated) {
        // 用户已有有效会话，重定向到dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      if (hasAccessToken && !isAuthenticated) {
        // 有token但未认证，尝试在客户端处理
        return NextResponse.next()
      }
    }

    return NextResponse.next()
    
  } catch (error) {
    console.error('Middleware error:', error)
    
    // 发生错误时，如果是受保护路径，重定向到登录页
    if (isProtectedPath) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}