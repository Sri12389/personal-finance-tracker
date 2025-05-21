"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

export function BudgetSummary() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetData, setBudgetData] = useState({
    totalBudget: 0,
    totalSpent: 0,
    percentageSpent: 0,
    remaining: 0,
  })
  const { user } = useAuth()
  const supabase = getBrowserClient()

  useEffect(() => {
    const fetchBudgetSummary = async () => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        // Get the current month's date range
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        // First, get all expense categories
        const { data: expenseCategories, error: catError } = await supabase
          .from("categories")
          .select("id")
          .eq("type", "expense")

        if (catError) throw new Error(`Error fetching expense categories: ${catError.message}`)
        if (!expenseCategories || expenseCategories.length === 0) {
          setBudgetData({
            totalBudget: 0,
            totalSpent: 0,
            percentageSpent: 0,
            remaining: 0,
          })
          setLoading(false)
          return
        }

        const expenseCategoryIds = expenseCategories.map((cat) => cat.id)

        // Then, fetch transactions for those categories
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("amount, category_id")
          .in("category_id", expenseCategoryIds)
          .gte("transaction_date", startOfMonth.toISOString())
          .lte("transaction_date", endOfMonth.toISOString())

        if (txError) throw new Error(`Error fetching transactions: ${txError.message}`)

        // Get budget goals for the current month
        const { data: budgetGoals, error: budgetError } = await supabase
          .from("budget_goals")
          .select("*")
          .eq("period", "monthly")
          .lte("start_date", endOfMonth.toISOString())
          .gte("end_date", startOfMonth.toISOString())

        if (budgetError) throw new Error(`Error fetching budget goals: ${budgetError.message}`)

        // Calculate total budget
        const totalBudget = budgetGoals?.reduce((sum, goal) => sum + goal.amount, 0) || 0

        // Calculate total spent
        const totalSpent =
          transactions?.reduce((sum, tx) => {
            // Only count negative amounts (expenses)
            return sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0)
          }, 0) || 0

        // Calculate percentage spent and remaining budget
        const percentageSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
        const remaining = totalBudget - totalSpent

        setBudgetData({
          totalBudget,
          totalSpent,
          percentageSpent: Math.min(percentageSpent, 100), // Cap at 100%
          remaining,
        })
      } catch (err: any) {
        console.error("Error fetching budget summary:", err)
        setError(err.message || "Failed to load budget data")
      } finally {
        setLoading(false)
      }
    }

    fetchBudgetSummary()
  }, [user, supabase])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <CardTitle className="text-red-700">Budget Summary Error</CardTitle>
          </div>
          <CardDescription className="text-red-600">We encountered a problem loading your budget data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-red-500">
            Please try refreshing the page. If the problem persists, contact support.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Budget Summary</CardTitle>
        <CardDescription>Your budget progress for the current month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">
              ${budgetData.totalSpent.toFixed(2)} of ${budgetData.totalBudget.toFixed(2)}
            </span>
            <span className="text-sm font-medium">{Math.round(budgetData.percentageSpent)}%</span>
          </div>
          <Progress value={budgetData.percentageSpent} className="h-2" />
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Spent</div>
              <div className="text-2xl font-bold">${budgetData.totalSpent.toFixed(2)}</div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm font-medium text-muted-foreground">Remaining</div>
              <div className="text-2xl font-bold">${budgetData.remaining.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
