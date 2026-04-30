import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

export function createSupabaseApiClient(request: NextRequest) {
  // Create a cookie store that reads from the request
  const cookieStore = {
    get(name: string) {
      return request.cookies.get(name)?.value
    },
    getAll() {
      return request.cookies.getAll().reduce((acc, cookie) => {
        acc[cookie.name] = cookie.value
        return acc
      }, {} as Record<string, string>)
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)
        },
      },
    }
  )
}