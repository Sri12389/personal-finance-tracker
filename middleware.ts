import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next()
    const supabase = createMiddlewareClient({ req, res })

    // Get the current session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Get the current URL path
    const path = req.nextUrl.pathname

    // Define protected and auth routes
    const isProtectedRoute =
      path.startsWith("/dashboard") ||
      path.startsWith("/transactions") ||
      path.startsWith("/settings") ||
      path.startsWith("/budget")

    const isAuthRoute = path.startsWith("/auth/login") || path.startsWith("/auth/register")

    // Handle redirections based on auth state
    if (isProtectedRoute && !session) {
      // Redirect to login if trying to access protected route without session
      const redirectUrl = new URL("/auth/login", req.url)
      redirectUrl.searchParams.set("redirectedFrom", path)
      return NextResponse.redirect(redirectUrl)
    }

    if (isAuthRoute && session) {
      // Redirect to dashboard if trying to access auth routes with active session
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    // Add the session to the response
    return res
  } catch (error) {
    console.error("Middleware error:", error)

    // In case of error, allow the request to continue
    // The error will be handled by the error boundary in the app
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/settings/:path*",
    "/budget/:path*",
    "/auth/login",
    "/auth/register",
  ],
}
