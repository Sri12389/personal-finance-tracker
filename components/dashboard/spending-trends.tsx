"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useDatabase } from "@/contexts/database-context"
import { useAuth } from "@/contexts/auth-context"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import {
  addDays,
  subDays,
  subMonths,
  startOfDay,
  endOfDay,
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns"

type ChartType = "line" | "bar" | "area"
type TimeRange = "7d" | "30d" | "90d" | "12m"

export function SpendingTrends() {
  const [chartType, setChartType] = useState<ChartType>("line")
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [chartData, setChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { getTransactions } = useDatabase()

  const fetchChartData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      let startDate: Date
      const endDate = endOfDay(now)
      let interval: "day" | "week" | "month" = "day"

      // Set date range based on selected time period
      switch (timeRange) {
        case "7d":
          startDate = startOfDay(subDays(now, 6))
          interval = "day"
          break
        case "30d":
          startDate = startOfDay(subDays(now, 29))
          interval = "day"
          break
        case "90d":
          startDate = startOfDay(subDays(now, 89))
          interval = "week"
          break
        case "12m":
          startDate = startOfDay(subMonths(now, 11))
          interval = "month"
          break
      }

      // Get transactions for the date range
      const transactions = await getTransactions({
        startDate,
        endDate,
      })

      // Generate date intervals
      let dateIntervals: Date[] = []
      if (interval === "day") {
        dateIntervals = eachDayOfInterval({ start: startDate, end: endDate })
      } else if (interval === "week") {
        dateIntervals = eachWeekOfInterval({ start: startDate, end: endDate })
      } else {
        dateIntervals = eachMonthOfInterval({ start: startDate, end: endDate })
      }

      // Initialize data for each interval
      const data = dateIntervals.map((date) => {
        const label =
          interval === "day"
            ? format(date, "MMM d")
            : interval === "week"
              ? `Week of ${format(date, "MMM d")}`
              : format(date, "MMM yyyy")

        return {
          date,
          label,
          income: 0,
          expenses: 0,
        }
      })

      // Aggregate transaction data
      transactions.forEach((transaction: any) => {
        // Handle different date formats from different database sources
        let transactionDate: Date

        if (transaction.transaction_date) {
          // Supabase format
          transactionDate = new Date(transaction.transaction_date)
        } else if (transaction.transactionDate) {
          // Firestore format - could be Date object or Timestamp
          transactionDate =
            transaction.transactionDate instanceof Date
              ? transaction.transactionDate
              : new Date(
                  transaction.transactionDate.toDate
                    ? transaction.transactionDate.toDate()
                    : transaction.transactionDate,
                )
        } else {
          // Fallback
          transactionDate = new Date(transaction.date || Date.now())
        }

        const amount = Number(transaction.amount)

        // Find the right interval for this transaction
        const intervalIndex = data.findIndex((d) => {
          if (interval === "day") {
            return isSameDay(d.date, transactionDate)
          } else if (interval === "month") {
            return isSameMonth(d.date, transactionDate)
          } else {
            // For week, check if transaction is within the week
            const weekEnd = addDays(d.date, 6)
            return transactionDate >= d.date && transactionDate <= weekEnd
          }
        })

        if (intervalIndex !== -1) {
          if (amount > 0) {
            data[intervalIndex].income += amount
          } else {
            data[intervalIndex].expenses += Math.abs(amount)
          }
        }
      })

      setChartData(data)
    } catch (error) {
      console.error("Error fetching chart data:", error)
      setError("Unable to load chart data. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }, [user, timeRange, getTransactions])

  useEffect(() => {
    if (user) {
      fetchChartData()
    }
  }, [user, timeRange, fetchChartData])

  const renderChart = () => {
    if (isLoading) {
      return <Skeleton className="h-[300px] w-full" />
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px]">
          <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchChartData} className="mt-4">
            Try Again
          </Button>
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No transaction data available for this period
        </div>
      )
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-background p-3 border rounded shadow-sm">
            <p className="font-medium">{label}</p>
            {payload.map((entry: any, index: number) => (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)}
              </p>
            ))}
          </div>
        )
      }
      return null
    }

    switch (chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                  return value
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10b981" name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        )
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                  return value
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )
      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                  return value
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="income" fill="#10b981" stroke="#10b981" name="Income" fillOpacity={0.3} />
              <Area
                type="monotone"
                dataKey="expenses"
                fill="#ef4444"
                stroke="#ef4444"
                name="Expenses"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Spending Trends</CardTitle>
          <CardDescription>Visualize your income and expenses over time</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Tabs defaultValue="line" value={chartType} onValueChange={(value) => setChartType(value as ChartType)}>
            <TabsList className="grid grid-cols-3 w-[180px]">
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
              <TabsTrigger value="area">Area</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs defaultValue="30d" value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
            <TabsList className="grid grid-cols-4 w-[200px]">
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
              <TabsTrigger value="90d">90d</TabsTrigger>
              <TabsTrigger value="12m">12m</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}
