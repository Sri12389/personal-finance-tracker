"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { useDatabase } from "@/contexts/database-context"
import { useAuth } from "@/contexts/auth-context"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Lightbulb, PieChart, Zap } from "lucide-react"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"
import type { JSX } from "react/jsx-runtime"

type InsightType = "summary" | "trends" | "tips"

interface SpendingInsight {
  category: string
  amount: number
  percentChange: number
  color: string
}

interface SpendingTip {
  id: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  icon: JSX.Element
}

export function EnhancedAIInsights() {
  const [activeTab, setActiveTab] = useState<InsightType>("summary")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [summary, setSummary] = useState({
    totalSpent: 0,
    monthlyChange: 0,
    topCategory: "",
    topCategoryAmount: 0,
    savingsRate: 0,
    unusualSpending: null as SpendingInsight | null,
  })
  const [trends, setTrends] = useState<SpendingInsight[]>([])
  const [tips, setTips] = useState<SpendingTip[]>([])

  const { user } = useAuth()
  const { getTransactions, getCategories } = useDatabase()

  useEffect(() => {
    if (!user) return
    generateInsights()
  }, [user])

  async function generateInsights() {
    setIsLoading(true)
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
      let currentMonthIncome = 0
      let currentMonthExpenses = 0
      const currentCategoryTotals: Record<string, { amount: number; name: string; color: string }> = {}

      currentMonthTransactions.forEach((transaction: any) => {
        const amount = Number(transaction.amount)

        // Handle income vs expense
        if (amount > 0) {
          currentMonthIncome += amount
        } else {
          currentMonthExpenses += Math.abs(amount)
        }

        // Track spending by category for expenses
        if (amount < 0) {
          // Get category info - handle both database formats
          let categoryId = transaction.category_id || transaction.categoryId
          let categoryName = "Uncategorized"
          let categoryColor = "#CBD5E1"

          if (transaction.category) {
            categoryId = transaction.category.id
            categoryName = transaction.category.name
            categoryColor = transaction.category.color || categoryColor
          } else {
            // Find category in categories array
            const category = categories.find(
              (c: any) => c.id === categoryId || c.id === Number(categoryId) || c.id === String(categoryId),
            )
            if (category) {
              categoryName = category.name
              categoryColor = category.color || categoryColor
            }
          }

          const key = String(categoryId || categoryName)
          if (!currentCategoryTotals[key]) {
            currentCategoryTotals[key] = {
              amount: 0,
              name: categoryName,
              color: categoryColor,
            }
          }
          currentCategoryTotals[key].amount += Math.abs(amount)
        }
      })

      // Calculate previous month totals by category
      const previousCategoryTotals: Record<string, number> = {}

      previousMonthTransactions.forEach((transaction: any) => {
        const amount = Number(transaction.amount)
        if (amount < 0) {
          const categoryId =
            transaction.category_id ||
            transaction.categoryId ||
            (transaction.category ? transaction.category.id : "uncategorized")
          const key = String(categoryId)

          if (!previousCategoryTotals[key]) {
            previousCategoryTotals[key] = 0
          }
          previousCategoryTotals[key] += Math.abs(amount)
        }
      })

      // Find top spending category
      let topCategory = { id: "", name: "None", amount: 0, color: "#CBD5E1" }
      Object.entries(currentCategoryTotals).forEach(([id, data]) => {
        if (data.amount > topCategory.amount) {
          topCategory = { id, name: data.name, amount: data.amount, color: data.color }
        }
      })

      // Calculate month-over-month change
      const previousMonthTotal = previousMonthTransactions
        .filter((t: any) => Number(t.amount) < 0)
        .reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)

      const monthlyChange =
        previousMonthTotal > 0 ? ((currentMonthExpenses - previousMonthTotal) / previousMonthTotal) * 100 : 0

      // Calculate savings rate
      const savingsRate =
        currentMonthIncome > 0 ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100 : 0

      // Generate spending trends
      const trends: SpendingInsight[] = []

      Object.entries(currentCategoryTotals).forEach(([id, data]) => {
        const previousAmount = previousCategoryTotals[id] || 0
        const percentChange =
          previousAmount > 0 ? ((data.amount - previousAmount) / previousAmount) * 100 : data.amount > 0 ? 100 : 0

        if (Math.abs(percentChange) > 10 || data.amount > currentMonthExpenses * 0.15) {
          trends.push({
            category: data.name,
            amount: data.amount,
            percentChange,
            color: data.color,
          })
        }
      })

      // Sort trends by absolute percent change
      trends.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))

      // Find unusual spending (significant increase in a category)
      let unusualSpending: SpendingInsight | null = null

      for (const trend of trends) {
        if (trend.percentChange > 30 && trend.amount > 50) {
          unusualSpending = trend
          break
        }
      }

      // Generate personalized tips based on the data
      const generatedTips: SpendingTip[] = []

      // Tip 1: Based on top category
      if (topCategory.name !== "None") {
        generatedTips.push({
          id: "top-category",
          title: `Optimize Your ${topCategory.name} Spending`,
          description: `You spent ${formatCurrency(topCategory.amount)} on ${topCategory.name} this month, which is your largest expense category. Consider setting a budget goal specifically for this category.`,
          impact: "high",
          icon: <PieChart className="h-5 w-5 text-primary" />,
        })
      }

      // Tip 2: Based on savings rate
      if (savingsRate < 20) {
        generatedTips.push({
          id: "savings-rate",
          title: "Increase Your Savings Rate",
          description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of your income. Try the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings.`,
          impact: "high",
          icon: <TrendingUp className="h-5 w-5 text-green-500" />,
        })
      } else {
        generatedTips.push({
          id: "savings-rate-good",
          title: "Great Savings Habit",
          description: `Your savings rate of ${savingsRate.toFixed(1)}% is excellent! Consider investing some of your savings for long-term growth.`,
          impact: "medium",
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        })
      }

      // Tip 3: Based on unusual spending
      if (unusualSpending) {
        generatedTips.push({
          id: "unusual-spending",
          title: `Unusual ${unusualSpending.category} Spending`,
          description: `Your spending on ${unusualSpending.category} increased by ${unusualSpending.percentChange.toFixed(1)}% compared to last month. Check if this was a one-time expense or if it's becoming a pattern.`,
          impact: "medium",
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
        })
      }

      // Tip 4: General financial wisdom
      const generalTips = [
        {
          id: "automate-savings",
          title: "Automate Your Savings",
          description:
            "Set up automatic transfers to your savings account on payday. What you don't see, you won't spend.",
          impact: "medium",
          icon: <Zap className="h-5 w-5 text-purple-500" />,
        },
        {
          id: "review-subscriptions",
          title: "Audit Your Subscriptions",
          description:
            "Review your recurring subscriptions and cancel those you don't use regularly. Small monthly fees add up quickly.",
          impact: "medium",
          icon: <RefreshCw className="h-5 w-5 text-blue-500" />,
        },
        {
          id: "emergency-fund",
          title: "Build an Emergency Fund",
          description:
            "Aim to save 3-6 months of essential expenses in an easily accessible account for unexpected situations.",
          impact: "high",
          icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
        },
      ]

      // Add 1-2 general tips
      const randomTips = generalTips.sort(() => 0.5 - Math.random()).slice(0, 2)
      generatedTips.push(...randomTips)

      // Update state with all insights
      setSummary({
        totalSpent: currentMonthExpenses,
        monthlyChange,
        topCategory: topCategory.name,
        topCategoryAmount: topCategory.amount,
        savingsRate,
        unusualSpending,
      })

      setTrends(trends.slice(0, 5))
      setTips(generatedTips)
    } catch (error) {
      console.error("Error generating insights:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    generateInsights()
  }

  const renderSummary = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Monthly Spending</h3>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">{formatCurrency(summary.totalSpent)}</span>
              <Badge variant={summary.monthlyChange > 0 ? "destructive" : "outline"} className="ml-2">
                {summary.monthlyChange > 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {Math.abs(summary.monthlyChange).toFixed(1)}% vs last month
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Top Spending Category</h3>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">{summary.topCategory}</span>
              <span className="ml-2 text-sm text-muted-foreground">{formatCurrency(summary.topCategoryAmount)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium text-muted-foreground">Savings Rate</h3>
            <span className="text-sm font-medium">{summary.savingsRate.toFixed(1)}%</span>
          </div>
          <Progress value={summary.savingsRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {summary.savingsRate < 10
              ? "Your savings rate is low. Try to increase it to at least 20%."
              : summary.savingsRate < 20
                ? "You're saving, but aim for at least 20% of your income."
                : "Great job! You're saving a healthy portion of your income."}
          </p>
        </div>

        {summary.unusualSpending && (
          <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h3 className="font-medium">Unusual Spending Detected</h3>
                <p className="text-sm mt-1">
                  Your spending on <span className="font-medium">{summary.unusualSpending.category}</span> has increased
                  by <span className="font-medium">{summary.unusualSpending.percentChange.toFixed(1)}%</span> compared
                  to last month.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTrends = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (trends.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Not enough data to analyze spending trends.</p>
          <p className="text-sm mt-2">Add more transactions to see insights.</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          These categories show significant changes in your spending patterns compared to last month.
        </p>

        {trends.map((trend, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: trend.color }} />
                <span className="font-medium">{trend.category}</span>
              </div>
              <div className="flex items-center">
                <span className="text-sm mr-2">{formatCurrency(trend.amount)}</span>
                <Badge variant={trend.percentChange > 0 ? "destructive" : "default"}>
                  {trend.percentChange > 0 ? "+" : ""}
                  {trend.percentChange.toFixed(1)}%
                </Badge>
              </div>
            </div>
            <Progress
              value={100}
              className="h-2"
              style={
                {
                  backgroundColor: `${trend.color}33`,
                  "--tw-progress-fill": trend.color,
                } as React.CSSProperties
              }
            />
            <p className="text-xs text-muted-foreground">
              {trend.percentChange > 0
                ? `Your spending on ${trend.category} has increased compared to last month.`
                : `You've reduced your spending on ${trend.category} compared to last month.`}
            </p>
          </div>
        ))}
      </div>
    )
  }

  const renderTips = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Personalized financial tips based on your spending patterns and financial goals.
        </p>

        {tips.map((tip) => (
          <div key={tip.id} className="bg-card border rounded-lg p-4">
            <div className="flex items-start gap-3">
              {tip.icon}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{tip.title}</h3>
                  <Badge variant={tip.impact === "high" ? "default" : "outline"} className="text-xs">
                    {tip.impact === "high" ? "High Impact" : tip.impact === "medium" ? "Medium Impact" : "Helpful"}
                  </Badge>
                </div>
                <p className="text-sm mt-1">{tip.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Financial Insights
          </CardTitle>
          <CardDescription>Personalized analysis of your financial data</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="sr-only">Refresh insights</span>
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" value={activeTab} onValueChange={(value) => setActiveTab(value as InsightType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>
          <div className="mt-4">
            <TabsContent value="summary">{renderSummary()}</TabsContent>
            <TabsContent value="trends">{renderTrends()}</TabsContent>
            <TabsContent value="tips">{renderTips()}</TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
