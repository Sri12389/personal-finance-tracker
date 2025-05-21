import type React from "react"
import { MainNav } from "@/components/main-nav"
import { BudgetAlerts } from "@/components/notifications/budget-alerts"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 p-4 md:p-8">{children}</main>
      <BudgetAlerts />
    </div>
  )
}
