"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getBrowserClient } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, DollarSign } from "lucide-react"

export function Overview() {
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [balance, setBalance] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getBrowserClient()

  useEffect(() => {
    async function fetchFinancialData() {
      try {
        // Get current month's start and end dates
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

        // Fetch transactions for the current month
        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("amount, category_id, categories(type)")
          .gte("transaction_date", startOfMonth)
          .lte("transaction_date", endOfMonth)
          .order("transaction_date", { ascending: false })

        if (error) {
          console.error("Error fetching transactions:", error)
          return
        }

        // Calculate totals
        let income = 0
        let expenses = 0

        transactions?.forEach((transaction) => {
          const amount = Number(transaction.amount)
          if (transaction.categories?.type === "income") {
            income += amount
          } else {
            expenses += Math.abs(amount)
          }
        })

        setTotalIncome(income)
        setTotalExpenses(expenses)
        setBalance(income - expenses)
      } catch (error) {
        console.error("Error in fetchFinancialData:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFinancialData()
  }, [supabase])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? <span className="text-muted-foreground">Loading...</span> : formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-muted-foreground">For the current month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? <span className="text-muted-foreground">Loading...</span> : formatCurrency(totalExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">For the current month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {isLoading ? <span className="text-muted-foreground">Loading...</span> : formatCurrency(balance)}
          </div>
          <p className="text-xs text-muted-foreground">Income - Expenses</p>
        </CardContent>
      </Card>
    </div>
  )
}
