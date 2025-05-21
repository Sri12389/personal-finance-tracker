"use client"

import { useEffect, useState } from "react"
import { getBrowserClient } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { Bell, AlertTriangle } from "lucide-react"

type BudgetAlert = {
  categoryName: string
  budgetAmount: number
  spentAmount: number
  percentage: number
}

export function useBudgetAlerts() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const supabase = getBrowserClient()

  useEffect(() => {
    checkBudgetAlerts()

    // Check for budget alerts every hour
    const interval = setInterval(checkBudgetAlerts, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  async function checkBudgetAlerts() {
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

      const newAlerts: BudgetAlert[] = []

      // For each budget goal, fetch the total spent in that category for the current month
      for (const goal of goals) {
        const { data: transactions, error: txError } = await supabase
          .from("transactions")
          .select("amount")
          .eq("category_id", goal.category_id)
          .gte("transaction_date", startOfMonth)
          .lte("transaction_date", endOfMonth)

        if (txError) {
          console.error("Error fetching transactions for budget goal:", txError)
          continue
        }

        // Calculate total spent (make sure to use absolute values for expenses)
        const spent = transactions.reduce((total, tx) => total + Math.abs(Number(tx.amount)), 0)
        const percentage = Math.round((spent / Number(goal.amount)) * 100)

        // Add to alerts if over 80% of budget
        if (percentage >= 80) {
          newAlerts.push({
            categoryName: goal.categories?.name || "Unknown",
            budgetAmount: Number(goal.amount),
            spentAmount: spent,
            percentage,
          })
        }
      }

      // Sort alerts by percentage (highest first)
      newAlerts.sort((a, b) => b.percentage - a.percentage)

      // Show toast notifications for critical alerts (over 90%)
      newAlerts.forEach((alert) => {
        if (alert.percentage >= 90) {
          toast({
            title: "Budget Alert",
            description: `You've used ${alert.percentage}% of your ${alert.categoryName} budget.`,
            action: (
              <div className="h-8 w-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </div>
            ),
          })
        }
      })

      setAlerts(newAlerts)
    } catch (error) {
      console.error("Error checking budget alerts:", error)
    }
  }

  return { alerts, checkBudgetAlerts }
}

export function BudgetAlerts() {
  const { alerts } = useBudgetAlerts()

  if (alerts.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border rounded-lg shadow-lg p-4 max-w-md" role="alert" aria-live="polite">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 text-yellow-500" />
          <h3 className="font-medium">Budget Alerts</h3>
        </div>

        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{alert.categoryName}</span>
                <span className={alert.percentage >= 100 ? "text-red-500 font-medium" : "text-yellow-500"}>
                  {formatCurrency(alert.spentAmount)} / {formatCurrency(alert.budgetAmount)}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${alert.percentage >= 100 ? "bg-red-500" : "bg-yellow-500"}`}
                  style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {alert.percentage >= 100
                  ? `You've exceeded your ${alert.categoryName} budget by ${formatCurrency(alert.spentAmount - alert.budgetAmount)}`
                  : `${alert.percentage}% of your ${alert.categoryName} budget used`}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
