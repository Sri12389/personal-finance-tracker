"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/contexts/auth-context"
import { DatabaseIndicator } from "@/components/database-indicator"
import { LayoutDashboard, Receipt, PiggyBank, Settings, Upload, Menu, X } from "lucide-react"
import { useState, useEffect } from "react"

export function MainNav() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // This ensures hydration mismatch doesn't occur
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
    },
    {
      href: "/transactions",
      label: "Transactions",
      active: pathname === "/transactions",
      icon: <Receipt className="h-4 w-4 mr-2" />,
    },
    {
      href: "/budget",
      label: "Budget",
      active: pathname === "/budget",
      icon: <PiggyBank className="h-4 w-4 mr-2" />,
    },
    {
      href: "/import",
      label: "Import",
      active: pathname === "/import",
      icon: <Upload className="h-4 w-4 mr-2" />,
    },
    {
      href: "/settings",
      label: "Settings",
      active: pathname === "/settings",
      icon: <Settings className="h-4 w-4 mr-2" />,
    },
  ]

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center">
          <Link href="/" className="font-bold text-xl flex items-center">
            <PiggyBank className="h-6 w-6 mr-2" />
            <span className="hidden md:inline">Finance Tracker</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden ml-auto"
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Desktop navigation */}
        <nav className="mx-6 hidden md:flex items-center space-x-4 lg:space-x-6">
          {routes.map((route) => (
            <Button
              asChild
              variant="ghost"
              key={route.href}
              className={cn(
                "justify-start",
                route.active ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline",
              )}
            >
              <Link href={route.href} className="flex items-center">
                {route.icon}
                {route.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto hidden md:flex items-center space-x-4">
          <DatabaseIndicator />
          <ModeToggle />
          {user && (
            <Button variant="outline" size="sm" onClick={signOut}>
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t">
          <div className="flex flex-col p-2 space-y-1">
            {routes.map((route) => (
              <Button
                asChild
                variant="ghost"
                key={route.href}
                className={cn(
                  "justify-start",
                  route.active ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href={route.href} className="flex items-center">
                  {route.icon}
                  {route.label}
                </Link>
              </Button>
            ))}
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <DatabaseIndicator />
              <div className="flex items-center space-x-2">
                <ModeToggle />
                {user && (
                  <Button variant="outline" size="sm" onClick={signOut}>
                    Logout
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
