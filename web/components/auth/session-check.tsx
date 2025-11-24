'use client'

import { useEffect } from 'react'
import { createClient } from '@/src/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SessionCheck() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check for session on mount and auth state changes
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Session check:', session?.user?.email || 'No session')
      } catch (error) {
        console.error('Session check error:', error)
      }
    }

    // Initial check
    checkSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN') {
          // Session established, ensure we're on the right page
          console.log('User signed in:', session?.user?.email)
        } else if (event === 'SIGNED_OUT') {
          // Session ended, redirect to sign in if needed
          console.log('User signed out')
          if (window.location.pathname.startsWith('/dashboard') || 
              window.location.pathname.startsWith('/profile')) {
            router.push('/sign-in')
          }
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
        } else if (event === 'USER_UPDATED') {
          console.log('User data updated')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth])

  return null
}