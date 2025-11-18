import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin, hash } = new URL(request.url)
  const code = searchParams.get('code')
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')
  const next = searchParams.get('next')
  const errorDescription = searchParams.get('error_description')
  
  // 默认重定向到dashboard，如果指定了next参数则使用它
  const redirectTo = next || '/dashboard'

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

  // 首先检查是否有错误描述
  if (errorDescription) {
    console.error('OAuth error from provider:', errorDescription)
    return Response.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(errorDescription)}`)
  }

  try {
    // 1. 处理 OAuth code 交换（标准流程）
    if (code) {
      console.log('Processing OAuth code exchange...')
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data.user) {
        console.log('✅ Auth successful with code for user:', data.user.email)
        return Response.redirect(`${origin}${redirectTo}`)
      }

      console.error('❌ Auth error with code:', error?.message || 'Unknown error')
      console.error('Error details:', error)
      
      // 如果有错误但用户存在，可能是会话问题，继续尝试
      if (data?.user) {
        console.log('User exists but session error, attempting redirect...')
        return Response.redirect(`${origin}${redirectTo}`)
      }
    }

    // 2. 处理直接的 access_token（某些 OAuth 流程可能返回）
    if (accessToken) {
      console.log('Processing direct access token...')
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      })

      if (!error && data.user) {
        console.log('✅ Auth successful with access token for user:', data.user.email)
        return Response.redirect(`${origin}${redirectTo}`)
      }

      console.error('❌ Auth error with access token:', error?.message || 'Unknown error')
      console.error('Error details:', error)
      
      // 如果有错误但用户存在，可能是会话问题，继续尝试
      if (data?.user) {
        console.log('User exists but session error, attempting redirect...')
        return Response.redirect(`${origin}${redirectTo}`)
      }
    }

    // 3. 检查 URL hash 中是否有 token（某些 GitHub OAuth 流程）
    if (hash && hash.includes('access_token')) {
      console.log('Processing access token from URL hash...')
      const hashParams = new URLSearchParams(hash.substring(1))
      const hashAccessToken = hashParams.get('access_token')
      const hashRefreshToken = hashParams.get('refresh_token')

      if (hashAccessToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken || ''
        })

        if (!error && data.user) {
          console.log('✅ Auth successful with hash access token for user:', data.user.email)
          return Response.redirect(`${origin}${redirectTo}`)
        }

        console.error('❌ Auth error with hash access token:', error?.message || 'Unknown error')
        console.error('Error details:', error)
        
        // 如果有错误但用户存在，可能是会话问题，继续尝试
        if (data?.user) {
          console.log('User exists but session error, attempting redirect...')
          return Response.redirect(`${origin}${redirectTo}`)
        }
      }
    }

    // 4. 检查是否已有有效会话（避免重复认证）
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      console.log('✅ User already has valid session, redirecting to:', redirectTo)
      return Response.redirect(`${origin}${redirectTo}`)
    }

    // 5. 记录失败详情并重定向到错误页面
    const hasAuthAttempt = code || accessToken || (hash && hash.includes('access_token'))
    
    if (hasAuthAttempt) {
      console.error('❌ All auth attempts failed despite having tokens in URL:', {
        code: !!code,
        accessToken: !!accessToken,
        hash: hash?.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      })
    } else {
      console.warn('⚠️ No authentication tokens found in callback URL')
    }

    // 返回错误页面，附带详细信息
    const errorParams = new URLSearchParams({
      error: hasAuthAttempt ? 'Authentication failed' : 'No authentication data received',
      timestamp: new Date().toISOString()
    })
    
    return Response.redirect(`${origin}/auth/auth-code-error?${errorParams.toString()}`)
    
  } catch (error) {
    console.error('💥 Unexpected error in auth callback:', error)
    
    // 返回错误页面，附带错误信息
    const errorParams = new URLSearchParams({
      error: 'Internal server error during authentication',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    })
    
    return Response.redirect(`${origin}/auth/auth-code-error?${errorParams.toString()}`)
  }
}