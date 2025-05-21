import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { ProfileSettings } from "@/components/settings/profile-settings"
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { DatabaseSettings } from "@/components/settings/database-settings"
import { requireAuth } from "@/lib/auth-utils"

export default async function SettingsPage() {
  // Ensure user is authenticated
  await requireAuth()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <ProfileSettings />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
          <AppearanceSettings />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
          <DatabaseSettings />
        </Suspense>
      </div>
    </div>
  )
}
