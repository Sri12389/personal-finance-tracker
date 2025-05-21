import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <div key={i} className="rounded-xl border bg-card text-card-foreground shadow">
              <div className="p-6 flex flex-col space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            </div>
          ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-7">
        <div className="md:col-span-1 lg:col-span-4">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
        <div className="md:col-span-1 lg:col-span-3">
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
