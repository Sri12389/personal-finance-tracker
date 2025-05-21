import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ResponsiveGrid } from "@/components/ui/responsive-grid"
import { Overview } from "@/components/dashboard/overview"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { FinancialSummary } from "@/components/dashboard/financial-summary"
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown"
import { BudgetProgress } from "@/components/dashboard/budget-progress"
import { AIInsights } from "@/components/dashboard/ai-insights"
import { SpendingTrends } from "@/components/dashboard/spending-trends"
import { MonthlyExpenseChart } from "@/components/dashboard/monthly-expense-chart"
import { requireAuth } from "@/lib/auth-utils"

export default async function DashboardPage() {
  // Ensure user is authenticated
  await requireAuth()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your financial activity</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[120px] w-full" />}>
        <FinancialSummary />
      </Suspense>

      <ResponsiveGrid>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <SpendingTrends />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <AIInsights />
        </Suspense>
      </ResponsiveGrid>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <MonthlyExpenseChart />
      </Suspense>

      <ResponsiveGrid>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <CategoryBreakdown />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <BudgetProgress />
        </Suspense>
      </ResponsiveGrid>

      <ResponsiveGrid>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <Overview />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <RecentTransactions />
        </Suspense>
      </ResponsiveGrid>
    </div>
  )
}
