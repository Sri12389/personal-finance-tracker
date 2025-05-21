import { Suspense } from "react"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Skeleton } from "@/components/ui/skeleton"
import { requireAuth } from "@/lib/auth-utils"

export default async function TransactionsPage() {
  // Ensure user is authenticated
  await requireAuth()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <p className="text-muted-foreground">Manage your income and expenses</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <TransactionForm />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <TransactionsTable />
      </Suspense>
    </div>
  )
}
