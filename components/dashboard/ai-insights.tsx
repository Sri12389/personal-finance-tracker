"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"
import { useDatabase } from "@/contexts/database-context"
import { useAuth } from "@/contexts/auth-context"
import { Lightbulb, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from "lucide-react"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export function AIInsights() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<{
    summary: string
    topCategory: string
    topCategoryAmount: number
    monthlyChange: number
    tip: string
  }>({
    summary: "",
    topCategory: "",
    topCategoryAmount: 0,
    monthlyChange: 0,
    tip: "",
  })
  const { user } = useAuth()
  const { getTransactions, getCategories } = useDatabase()

  const generateInsights = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      // Get current and previous month date ranges
      const now = new Date()
      const currentMonthStart = startOfMonth(now)
      const currentMonthEnd = endOfMonth(now)
      const previousMonthStart = startOfMonth(subMonths(now, 1))
      const previousMonthEnd = endOfMonth(subMonths(now, 1))

      // Get transactions for current and previous months
      const currentMonthTransactions = await getTransactions({
        startDate: currentMonthStart,
        endDate: currentMonthEnd,
      })

      const previousMonthTransactions = await getTransactions({
        startDate: previousMonthStart,
        endDate: previousMonthEnd,
      })

      // Get all categories
      const categories = await getCategories()

      // Calculate current month totals
      let currentMonthTotal = 0
      const categoryTotals: Record<string, { amount: number; name: string }> = {}

      currentMonthTransactions.forEach((transaction: any) => {
        const amount = Number(transaction.amount)
        if (amount < 0) {
          currentMonthTotal += Math.abs(amount)

          // Get category info - handle both database formats
          let categoryId = transaction.category_id || transaction.categoryId
          let categoryName = "Uncategorized"

          if (transaction.category) {
            categoryId = transaction.category.id
            categoryName = transaction.category.name
          } else {
            // Find category in categories array
            const category = categories.find(
              (c: any) => c.id === categoryId || c.id === Number(categoryId) || c.id === String(categoryId),
            )
            if (category) {
              categoryName = category.name
            }
          }

          const key = String(categoryId || categoryName)
          if (!categoryTotals[key]) {
            categoryTotals[key] = {
              amount: 0,
              name: categoryName,
            }
          }
          categoryTotals[key].amount += Math.abs(amount)
        }
      })

      // Find top spending category
      let topCategory = { name: "None", amount: 0 }
      Object.values(categoryTotals).forEach((data) => {
        if (data.amount > topCategory.amount) {
          topCategory = { name: data.name, amount: data.amount }
        }
      })

      // Calculate month-over-month change
      const previousMonthTotal = previousMonthTransactions
        .filter((t: any) => Number(t.amount) < 0)
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

      const monthlyChange =
        previousMonthTotal > 0 ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100 : 0

      // Generate summary
      const currentMonthName = format(now, "MMMM")
      let summary = ""

      if (currentMonthTransactions.length === 0) {
        summary = `You haven't recorded any transactions for ${currentMonthName} yet.`
      } else if (monthlyChange > 10) {
        summary = `Your spending in ${currentMonthName} (${formatCurrency(currentMonthTotal)}) has increased by ${Math.abs(monthlyChange).toFixed(1)}% compared to last month.`
      } else if (monthlyChange < -10) {
        summary = `Great job! Your spending in ${currentMonthName} (${formatCurrency(currentMonthTotal)}) has decreased by ${Math.abs(monthlyChange).toFixed(1)}% compared to last month.`
      } else {
        summary = `Your spending in ${currentMonthName} (${formatCurrency(currentMonthTotal)}) is similar to last month.`
      }

      // Generate a tip based on the data
      const tips = [
        `Consider setting a budget for ${topCategory.name}, your highest spending category this month.`,
        "Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings.",
        "Review your subscriptions regularly to identify services you no longer use.",
        "Set up automatic transfers to your savings account on payday.",
        "Track your daily expenses to identify areas where you can cut back.",
        "Build an emergency fund that covers 3-6 months of essential expenses.",
        "Pay off high-interest debt first to save money in the long run.",
        "Look for cashback or rewards programs for your regular purchases.",
      ]

      // Choose a tip based on the data or randomly if no specific condition is met
      let tip = ""
      if (topCategory.amount > currentMonthTotal * 0.4) {
        tip = tips[0] // Suggest budgeting for top category if it's over 40% of spending
      } else if (monthlyChange > 20) {
        tip = tips[4] // Suggest tracking daily expenses if spending increased significantly
      } else {
        // Choose a random tip from the remaining ones
        const randomIndex = Math.floor(Math.random() * (tips.length - 2)) + 2
        tip = tips[randomIndex]
      }

      setInsights({
        summary,
        topCategory: topCategory.name,
        topCategoryAmount: topCategory.amount,
        monthlyChange,
        tip,
      })
    } catch (error) {
      console.error("Error generating insights:", error)
      setError("Unable to generate insights at this time.")
      setInsights({
        summary: "Unable to generate insights at this time.",
        topCategory: "",
        topCategoryAmount: 0,
        monthlyChange: 0,
        tip: "Try adding more transactions to get personalized financial insights.",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [user, getTransactions, getCategories])

  useEffect(() => {
    if (user) {
      generateInsights()
    }
  }, [user, generateInsights])

  const handleRefresh = () => {
    setIsRefreshing(true)
    generateInsights()
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>AI Insights</CardTitle>
          <CardDescription>Personalized analysis of your spending</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh insights</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="mt-6 pt-6 border-t">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full mt-2" />
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Spending Summary</h3>
              <p className="mt-2 text-muted-foreground">{insights.summary}</p>

              {insights.topCategory !== "None" && (
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Top Category</p>
                    <p className="font-medium">{insights.topCategory}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatCurrency(insights.topCategoryAmount)}</p>
                  </div>
                </div>
              )}

              {insights.monthlyChange !== 0 && (
                <div className="mt-4 flex items-center">
                  {insights.monthlyChange > 0 ? (
                    <TrendingUp className="h-5 w-5 text-red-500 mr-2" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-500 mr-2" />
                  )}
                  <span>
                    {insights.monthlyChange > 0 ? "Increased by " : "Decreased by "}
                    <span className="font-medium">{Math.abs(insights.monthlyChange).toFixed(1)}%</span> compared to last
                    month
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-start">
                <Lightbulb className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-lg font-medium">Financial Tip</h3>
                  <p className="mt-1 text-muted-foreground">{insights.tip}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
