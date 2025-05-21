import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { BudgetSummary } from "@/components/budget/budget-summary"
import { BudgetGoalsList } from "@/components/budget/budget-goals-list"
import { BudgetGoalForm } from "@/components/budget/budget-goal-form"
import { withErrorHandling } from "@/lib/error-handling"
import { ErrorBoundary } from "@/components/error-boundary"

export default async function BudgetPage() {
  return withErrorHandling(
    async () => (
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
          <p className="text-muted-foreground">Manage your budget goals and track your spending</p>
        </div>

        <ErrorBoundary
          fallback={<div className="p-4 border rounded-md bg-red-50 text-red-500">Failed to load budget summary</div>}
        >
          <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
            <BudgetSummary />
          </Suspense>
        </ErrorBoundary>

        <div className="grid gap-8 md:grid-cols-2">
          <ErrorBoundary
            fallback={<div className="p-4 border rounded-md bg-red-50 text-red-500">Failed to load budget goals</div>}
          >
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <BudgetGoalsList />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary
            fallback={
              <div className="p-4 border rounded-md bg-red-50 text-red-500">Failed to load budget goal form</div>
            }
          >
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <BudgetGoalForm />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    ),
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="mb-4">We're having trouble loading the budget page. Please try again later.</p>
      <p className="text-sm text-muted-foreground">Error code: 445224725</p>
    </div>,
    "Error rendering budget page",
  )
}
