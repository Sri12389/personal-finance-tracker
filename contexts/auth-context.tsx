"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation"
import { getBrowserClient } from "@/lib/supabase"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{
    error: Error | null
    success: boolean
  }>
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{
    error: Error | null
    success: boolean
  }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = getBrowserClient()

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          setIsLoading(false)
          return
        }

        if (session) {
          setSession(session)
          setUser(session.user)

          // If user is on an auth page but is already authenticated, redirect to dashboard
          if (pathname?.startsWith("/auth") && pathname !== "/auth/verify") {
            router.push("/dashboard")
          }
        } else {
          // If user is not authenticated and on a protected route, redirect to login
          if (
            pathname?.startsWith("/dashboard") ||
            pathname?.startsWith("/transactions") ||
            pathname?.startsWith("/settings") ||
            pathname?.startsWith("/budget")
          ) {
            router.push("/auth/login")
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email)

      setSession(session)
      setUser(session?.user ?? null)

      if (event === "SIGNED_IN" && session) {
        // Redirect to dashboard on sign in
        router.push("/dashboard")
      } else if (event === "SIGNED_OUT") {
        // Redirect to login on sign out
        router.push("/auth/login")
      }

      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname, supabase.auth])

  // Update the signIn function to properly handle navigation and state updates
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error.message)
        return { error, success: false }
      }

      if (data.session) {
        console.log("Sign in successful, updating state")

        // Update local state
        setSession(data.session)
        setUser(data.user)

        // Use router for navigation instead of window.location
        router.push("/dashboard")
        return { error: null, success: true }
      }

      return { error: new Error("No session returned"), success: false }
    } catch (err: any) {
      console.error("Unexpected error during sign in:", err)
      return { error: new Error(err.message || "An unexpected error occurred"), success: false }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { error, success: false }
      }

      router.push("/auth/verify")
      return { error: null, success: true }
    } catch (err: any) {
      console.error("Unexpected error during sign up:", err)
      return { error: new Error(err.message || "An unexpected error occurred"), success: false }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      router.push("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
