"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { getBrowserClient } from "@/lib/supabase"
import type { TransactionWithCategory } from "@/types/supabase"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { ShoppingBag, ArrowUpRight, ArrowDownLeft } from "lucide-react"

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = getBrowserClient()

  useEffect(() => {
    async function fetchRecentTransactions() {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .select(`
            *,
            category:categories(*)
          `)
          .order("transaction_date", { ascending: false })
          .limit(5)

        if (error) {
          console.error("Error fetching recent transactions:", error)
          return
        }

        setTransactions(data as TransactionWithCategory[])
      } catch (error) {
        console.error("Error in fetchRecentTransactions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentTransactions()
  }, [supabase])

  function getCategoryIcon(category: any) {
    if (!category) return <ShoppingBag className="h-4 w-4" />

    // This is a simplified version - in a real app, you'd use dynamic icons
    return <ShoppingBag className="h-4 w-4" style={{ color: category.color || "currentColor" }} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your latest financial activities</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading recent transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No transactions found. Add your first transaction to get started.
          </div>
        ) : (
          <div className="space-y-6">
            {transactions.map((transaction) => {
              const isIncome = transaction.category?.type === "income"
              const amount = Number(transaction.amount)

              return (
                <div key={transaction.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-9 w-9 bg-muted">
                      <div className="flex h-full w-full items-center justify-center">
                        {isIncome ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium leading-none">{transaction.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.category?.name || "Uncategorized"} •{" "}
                        {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${isIncome ? "text-green-500" : "text-red-500"}`}>
                    {isIncome ? "+" : "-"}
                    {formatCurrency(Math.abs(amount))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Link href="/transactions" className="w-full">
          <Button variant="outline" className="w-full">
            View All Transactions
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
