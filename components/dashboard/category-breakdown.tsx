"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { useDatabase } from "@/contexts/database-context"
import { useAuth } from "@/contexts/auth-context"
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from "date-fns"

type CategoryTotal = {
  id: string
  name: string
  value: number
  color: string
}

type TimePeriod = "thisMonth" | "lastMonth" | "thisYear" | "allTime"

export function CategoryBreakdown() {
  const [categoryData, setCategoryData] = useState<CategoryTotal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("thisMonth")
  const [totalExpenses, setTotalExpenses] = useState(0)
  const { user } = useAuth()
  const { getTransactions, getCategories } = useDatabase()

  useEffect(() => {
    if (!user) return

    fetchCategoryData()
  }, [user, timePeriod])

  async function fetchCategoryData() {
    setIsLoading(true)
    try {
      // Get date range based on selected time period
      let startDate: Date
      let endDate: Date = new Date()

      switch (timePeriod) {
        case "thisMonth":
          startDate = startOfMonth(new Date())
          endDate = endOfMonth(new Date())
          break
        case "lastMonth":
          startDate = startOfMonth(subMonths(new Date(), 1))
          endDate = endOfMonth(subMonths(new Date(), 1))
          break
        case "thisYear":
          startDate = startOfYear(new Date())
          endDate = endOfYear(new Date())
          break
        case "allTime":
          startDate = new Date(0) // Beginning of time
          break
      }

      // Get all categories
      const categories = await getCategories()

      // Get transactions for the date range
      const transactions = await getTransactions({
        startDate,
        endDate,
      })

      // Filter for expense transactions only
      const expenseTransactions = transactions.filter((t: any) => {
        // Handle both Supabase and Firestore transaction formats
        if ("amount" in t) {
          const amount = Number(t.amount)
          return amount < 0
        }
        return false
      })

      // Calculate total expenses
      const total = expenseTransactions.reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount)), 0)
      setTotalExpenses(total)

      // Group by category and sum amounts
      const categoryTotals: Record<string, CategoryTotal> = {}

      expenseTransactions.forEach((transaction: any) => {
        // Handle both Supabase and Firestore transaction formats
        let categoryId: string | number | null = null
        let categoryName = "Uncategorized"
        let categoryColor = "#CBD5E1"

        if ("category_id" in transaction) {
          categoryId = transaction.category_id

          // Find category in categories array
          const category = categories.find(
            (c: any) => c.id === categoryId || c.id === Number(categoryId) || c.id === String(categoryId),
          )

          if (category) {
            categoryName = category.name
            categoryColor = category.color || "#CBD5E1"
          }
        } else if ("categoryId" in transaction) {
          categoryId = transaction.categoryId

          // Find category in categories array
          const category = categories.find(
            (c: any) => c.id === categoryId || c.id === Number(categoryId) || c.id === String(categoryId),
          )

          if (category) {
            categoryName = category.name
            categoryColor = category.color || "#CBD5E1"
          }
        } else if ("category" in transaction && transaction.category) {
          categoryId = transaction.category.id
          categoryName = transaction.category.name
          categoryColor = transaction.category.color || "#CBD5E1"
        }

        const categoryKey = String(categoryId || "uncategorized")
        const amount = Math.abs(Number(transaction.amount))

        if (!categoryTotals[categoryKey]) {
          categoryTotals[categoryKey] = {
            id: categoryKey,
            name: categoryName,
            value: 0,
            color: categoryColor,
          }
        }

        categoryTotals[categoryKey].value += amount
      })

      // Convert to array and sort by value
      const categoryArray = Object.values(categoryTotals).sort((a, b) => b.value - a.value)

      setCategoryData(categoryArray)
    } catch (error) {
      console.error("Error in fetchCategoryData:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / totalExpenses) * 100).toFixed(1)
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
        </div>
      )
    }
    return null
  }

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case "thisMonth":
        return format(new Date(), "MMMM yyyy")
      case "lastMonth":
        return format(subMonths(new Date(), 1), "MMMM yyyy")
      case "thisYear":
        return format(new Date(), "yyyy")
      case "allTime":
        return "All Time"
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Your spending by category for {getTimePeriodLabel()}</CardDescription>
        </div>
        <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="thisMonth">This Month</SelectItem>
            <SelectItem value="lastMonth">Last Month</SelectItem>
            <SelectItem value="thisYear">This Year</SelectItem>
            <SelectItem value="allTime">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">Loading category data...</div>
        ) : categoryData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No expense data available for this period
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={`cell-${entry.id}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">Top Categories</h3>
              <div className="space-y-3">
                {categoryData.slice(0, 5).map((category) => (
                  <div key={category.id} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                      <span>{category.name}</span>
                    </div>
                    <div className="text-right">
                      <div>{formatCurrency(category.value)}</div>
                      <div className="text-xs text-muted-foreground">
                        {((category.value / totalExpenses) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total Expenses</span>
                  <span>{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
