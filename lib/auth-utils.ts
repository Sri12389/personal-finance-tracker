import { getServerClient } from "@/lib/supabase"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const supabase = getServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  return session
}
