import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Create a supabase client on the browser with project's credentials
  // These environment variables must be set in a .env.local file.
  // NEXT_PUBLIC_SUPABASE_URL
  // NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}