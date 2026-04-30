import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Helper to get the current session's access token
export async function getAccessToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}