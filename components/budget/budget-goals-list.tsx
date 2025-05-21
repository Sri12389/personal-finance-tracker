"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export function BudgetGoalsList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [budgetGoals, setBudgetGoals] = useState<any[]>([])
  const [categories, setCategories] = useState<Record<string, any>>({})
  const { user } = useAuth()
  const supabase = getBrowserClient()

  useEffect(() => {
    const fetchBudgetGoals = async () => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        // Fetch categories first
        const { data: categoriesData, error: catError } = await supabase.from("categories").select("id, name, color")

        if (catError) throw new Error(`Error fetching categories: ${catError.message}`)

        // Create a lookup object for categories
        const categoriesLookup = (categoriesData || []).reduce(
          (acc, cat) => {
            acc[cat.id] = cat
            return acc
          },
          {} as Record<string, any>,
        )

        setCategories(categoriesLookup)

        // Get the current month's date range
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        // Fetch budget goals
        const { data: goalsData, error: goalsError } = await supabase
          .from("budget_goals")
          .select("*")
          .order("created_at", { ascending: false })

        if (goalsError) throw new Error(`Error fetching budget goals: ${goalsError.message}`)

        // For each budget goal, fetch the current spending
        const goalsWithProgress = await Promise.all(
          (goalsData || []).map(async (goal) => {
            try {
              // Fetch transactions for this category
              const { data: transactions, error: txError } = await supabase
                .from("transactions")
                .select("amount")
                .eq("category_id", goal.category_id)
                .gte("transaction_date", startOfMonth.toISOString())
                .lte("transaction_date", endOfMonth.toISOString())

              if (txError) throw txError

              // Calculate total spent (use absolute value for expenses)
              const spent = (transactions || []).reduce((total, tx) => {
                return total + Math.abs(tx.amount < 0 ? tx.amount : 0)
              }, 0)

              const remaining = goal.amount - spent
              const percentage = (spent / goal.amount) * 100

              return {
                ...goal,
                spent,
                remaining,
                percentage: Math.min(percentage, 100), // Cap at 100%
              }
            } catch (err) {
              console.error(`Error processing goal ${goal.id}:`, err)
              return {
                ...goal,
                spent: 0,
                remaining: goal.amount,
                percentage: 0,
                error: true,
              }
            }
          }),
        )

        setBudgetGoals(goalsWithProgress)
      } catch (err: any) {
        console.error("Error fetching budget goals:", err)
        setError(err.message || "Failed to load budget goals")
      } finally {
        setLoading(false)
      }
    }

    fetchBudgetGoals()
  }, [user, supabase])

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase.from("budget_goals").delete().eq("id", goalId)

      if (error) throw error

      // Update the state to remove the deleted goal
      setBudgetGoals((prev) => prev.filter((goal) => goal.id !== goalId))
    } catch (err: any) {
      console.error("Error deleting budget goal:", err)
      // You could add a toast notification here
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
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
            <CardTitle className="text-red-700">Budget Goals Error</CardTitle>
          </div>
          <CardDescription className="text-red-600">We encountered a problem loading your budget goals</CardDescription>
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

  if (budgetGoals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Goals</CardTitle>
          <CardDescription>You haven't set any budget goals yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Create a budget goal to start tracking your spending against your budget
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Goals</CardTitle>
        <CardDescription>Track your spending against your budget goals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {budgetGoals.map((goal) => (
          <div key={goal.id} className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">{categories[goal.category_id]?.name || "Unknown Category"}</h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this budget goal. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteGoal(goal.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Progress
              value={goal.percentage}
              className="h-2"
              indicatorColor={goal.percentage > 90 ? "bg-red-500" : goal.percentage > 75 ? "bg-amber-500" : undefined}
            />
            <div className="flex justify-between text-sm">
              <span>
                ${goal.spent.toFixed(2)} of ${goal.amount.toFixed(2)}
              </span>
              <span
                className={
                  goal.percentage > 90
                    ? "text-red-500 font-medium"
                    : goal.percentage > 75
                      ? "text-amber-500 font-medium"
                      : ""
                }
              >
                {Math.round(goal.percentage)}%
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
