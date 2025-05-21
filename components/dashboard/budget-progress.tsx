"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getBrowserClient } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

type BudgetStatus = {
  categoryName: string
  categoryId: number
  budgetAmount: number
  spentAmount: number
  percentage: number
  color: string
}

export function BudgetProgress() {
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getBrowserClient()

  useEffect(() => {
    async function fetchBudgetProgress() {
      try {
        // Get current month's start and end dates
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

        // Fetch monthly budget goals with their categories
        const { data: goals, error: goalsError } = await supabase
          .from("budget_goals")
          .select(`
            amount,
            category_id,
            categories(name, color)
          `)
          .eq("period", "monthly")
          .lte("start_date", endOfMonth)
          .or(`end_date.gt.${startOfMonth},end_date.is.null`)

        if (goalsError) {
          throw goalsError
        }

        // For each budget goal, fetch the total spent in that category for the current month
        const budgetStatusPromises = goals.map(async (goal) => {
          const { data: transactions, error: txError } = await supabase
            .from("transactions")
            .select("amount")
            .eq("category_id", goal.category_id)
            .gte("transaction_date", startOfMonth)
            .lte("transaction_date", endOfMonth)

          if (txError) {
            console.error("Error fetching transactions for budget goal:", txError)
            return null
          }

          // Calculate total spent (make sure to use absolute values for expenses)
          const spent = transactions.reduce((total, tx) => total + Math.abs(Number(tx.amount)), 0)
          const percentage = Math.min(Math.round((spent / Number(goal.amount)) * 100), 100)

          return {
            categoryName: goal.categories?.name || "Unknown",
            categoryId: goal.category_id,
            budgetAmount: Number(goal.amount),
            spentAmount: spent,
            percentage,
            color: goal.categories?.color || "#CBD5E1",
          }
        })

        const budgetStatuses = (await Promise.all(budgetStatusPromises)).filter(Boolean) as BudgetStatus[]

        // Sort by percentage (highest first)
        budgetStatuses.sort((a, b) => b.percentage - a.percentage)

        // Take only the top 3
        setBudgetStatuses(budgetStatuses.slice(0, 3))
      } catch (error) {
        console.error("Error fetching budget progress:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBudgetProgress()
  }, [supabase])

  function getProgressColor(percentage: number) {
    if (percentage >= 100) return "bg-red-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Progress</CardTitle>
        <CardDescription>Track your spending against your budget goals</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading budget progress...</div>
        ) : budgetStatuses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mb-2" />
            <h3 className="font-medium text-lg">No Budget Goals Set</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up budget goals to track your spending and stay on target.
            </p>
            <Link href="/budget">
              <Button>Set Budget Goals</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {budgetStatuses.map((status, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{status.categoryName}</span>
                  <span className={status.percentage >= 100 ? "text-red-500 font-medium" : ""}>
                    {formatCurrency(status.spentAmount)} / {formatCurrency(status.budgetAmount)}
                  </span>
                </div>
                <div className="space-y-1">
                  <Progress value={status.percentage} className={`h-2 ${getProgressColor(status.percentage)}`} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{status.percentage}% used</span>
                    <span>{status.percentage >= 100 ? "Over budget" : `${100 - status.percentage}% remaining`}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/budget" className="w-full">
          <Button variant="outline" className="w-full">
            View All Budget Goals
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
