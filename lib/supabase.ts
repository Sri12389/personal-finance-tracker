import { createClient } from "@supabase/supabase-js"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Database } from "@/types/supabase"

// For server components
export function getServerClient() {
  return createServerComponentClient<Database>({ cookies })
}

// For client components - singleton pattern
let browserClient: ReturnType<typeof createClientComponentClient<Database>> | null = null

export function getBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("getBrowserClient should only be called in client components")
  }

  if (!browserClient) {
    browserClient = createClientComponentClient<Database>()
  }

  return browserClient
}

// Direct client for specific use cases
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let directClient: ReturnType<typeof createClient> | null = null

export function getDirectClient() {
  if (!directClient) {
    directClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return directClient
}
