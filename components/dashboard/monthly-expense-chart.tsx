"use client"

import { useState, useEffect } from "react"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useDatabase } from "@/contexts/database-context"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/utils"

type ChartData = {
  name: string
  expenses: number
  income: number
}

export function MonthlyExpenseChart() {
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>("6")
  const { getTransactions } = useDatabase()

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      setError(null)

      try {
        const months = Number.parseInt(timeRange)
        const now = new Date()
        const data: ChartData[] = []

        // Generate data for each month
        for (let i = 0; i < months; i++) {
          const date = subMonths(now, i)
          const monthStart = startOfMonth(date)
          const monthEnd = endOfMonth(date)

          const transactions = await getTransactions({
            startDate: monthStart,
            endDate: monthEnd,
          })

          let monthlyIncome = 0
          let monthlyExpenses = 0

          transactions.forEach((tx) => {
            const amount = typeof tx.amount === "number" ? tx.amount : Number.parseFloat(tx.amount as string)
            if (amount > 0) {
              monthlyIncome += amount
            } else {
              monthlyExpenses += Math.abs(amount)
            }
          })

          data.unshift({
            name: format(date, "MMM yyyy"),
            income: monthlyIncome,
            expenses: monthlyExpenses,
          })
        }

        setChartData(data)
      } catch (err: any) {
        console.error("Error fetching chart data:", err)
        setError(err.message || "Failed to load chart data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [timeRange, getTransactions])

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-sm p-3">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-green-600">Income: {formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-red-600">Expenses: {formatCurrency(payload[1].value)}</p>
          <p className="text-sm font-medium">Net: {formatCurrency(payload[0].value - payload[1].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Monthly Income & Expenses</CardTitle>
          <CardDescription>Track your monthly financial activity</CardDescription>
        </div>
        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 Months</SelectItem>
            <SelectItem value="6">6 Months</SelectItem>
            <SelectItem value="12">12 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="w-full h-[300px]">
            <Skeleton className="w-full h-full" />
          </div>
        ) : error ? (
          <div className="w-full h-[300px] flex items-center justify-center">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} tickMargin={10} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
