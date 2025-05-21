import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { CSVImport } from "@/components/transactions/csv-import"
import { requireAuth } from "@/lib/auth-utils"

export default async function ImportPage() {
  // Ensure user is authenticated
  await requireAuth()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Import Transactions</h2>
        <p className="text-muted-foreground">Import transactions from external sources</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
        <CSVImport />
      </Suspense>
    </div>
  )
}
