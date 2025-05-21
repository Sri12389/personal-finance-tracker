"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, DollarSign, AlertCircle } from "lucide-react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useDatabase } from "@/contexts/database-context"
import { useAuth } from "@/contexts/auth-context"
import { addDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

type DateRange = {
  from: Date
  to?: Date
}

export function FinancialSummary() {
  const [period, setPeriod] = useState<"month" | "year" | "custom">("month")
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const { getFinancialSummary } = useDatabase()

  const fetchFinancialData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      let startDate: Date
      let endDate: Date

      if (period === "month") {
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
      } else if (period === "year") {
        startDate = startOfYear(new Date())
        endDate = endOfYear(new Date())
      } else {
        // Custom date range
        startDate = dateRange.from
        endDate = dateRange.to || addDays(dateRange.from, 1)
      }

      console.log("Fetching financial summary:", { startDate, endDate })

      const summary = await getFinancialSummary({
        startDate,
        endDate,
      })

      console.log("Financial summary data:", summary)

      setTotalIncome(summary.income)
      setTotalExpenses(summary.expenses)
      setBalance(summary.balance)
    } catch (error) {
      console.error("Error fetching financial data:", error)
      setError("Failed to load financial data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [user, period, dateRange, getFinancialSummary])

  useEffect(() => {
    if (user) {
      fetchFinancialData()
    }
  }, [user, period, dateRange, fetchFinancialData])

  const handlePeriodChange = (value: string) => {
    setPeriod(value as "month" | "year" | "custom")

    if (value === "month") {
      setDateRange({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      })
    } else if (value === "year") {
      setDateRange({
        from: startOfYear(new Date()),
        to: endOfYear(new Date()),
      })
    }
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range)
      setPeriod("custom")
    }
  }

  const getPeriodLabel = () => {
    if (period === "month") {
      return format(new Date(), "MMMM yyyy")
    } else if (period === "year") {
      return format(new Date(), "yyyy")
    } else {
      return `${format(dateRange.from, "MMM d, yyyy")} - ${dateRange.to ? format(dateRange.to, "MMM d, yyyy") : format(dateRange.from, "MMM d, yyyy")}`
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-normal">
          Financial Summary
          <span className="block text-sm text-muted-foreground">{getPeriodLabel()}</span>
        </CardTitle>
        <div className="flex items-center space-x-2">
          <Tabs defaultValue="month" value={period} onValueChange={handlePeriodChange} className="w-full md:w-[400px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="custom" className="mt-2">
              <DateRangePicker date={dateRange} onDateChange={handleDateRangeChange} />
            </TabsContent>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-2" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchFinancialData} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <ArrowUpIcon className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <ArrowDownIcon className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
