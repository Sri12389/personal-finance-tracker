"use client"

import { useState } from "react"
import { getBrowserClient } from "@/lib/supabase"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, Database, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { collection, doc, setDoc, Timestamp, serverTimestamp } from "firebase/firestore"

export function DatabaseMigration() {
  const [isMigrating, setIsMigrating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<string>("")
  const [migrationResults, setMigrationResults] = useState<{
    success: boolean
    profileMigrated: boolean
    categoriesMigrated: number
    transactionsMigrated: number
    budgetGoalsMigrated: number
    errors: string[]
  } | null>(null)
  const supabase = getBrowserClient()
  const { user } = useAuth()

  async function startMigration() {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to migrate your data.",
        variant: "destructive",
      })
      return
    }

    setIsMigrating(true)
    setProgress(0)
    setStep("Initializing migration...")
    setMigrationResults(null)

    const errors: string[] = []
    let profileMigrated = false
    let categoriesMigrated = 0
    let transactionsMigrated = 0
    let budgetGoalsMigrated = 0

    try {
      // Step 1: Migrate user profile
      setStep("Migrating user profile...")
      setProgress(10)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError) {
        errors.push(`Error fetching profile: ${profileError.message}`)
      } else if (profile) {
        try {
          await setDoc(doc(db, "users", user.id), {
            id: user.id,
            email: profile.email,
            fullName: profile.full_name,
            avatarUrl: profile.avatar_url,
            createdAt: Timestamp.fromDate(new Date(profile.created_at)),
            updatedAt: serverTimestamp(),
          })
          profileMigrated = true
        } catch (error: any) {
          errors.push(`Error migrating profile: ${error.message}`)
        }
      }

      // Step 2: Migrate categories
      setStep("Migrating categories...")
      setProgress(30)

      const { data: categories, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)

      if (categoriesError) {
        errors.push(`Error fetching categories: ${categoriesError.message}`)
      } else if (categories && categories.length > 0) {
        const categoriesCollection = collection(db, "categories")

        for (const category of categories) {
          try {
            await setDoc(doc(categoriesCollection), {
              userId: user.id,
              name: category.name,
              icon: category.icon,
              color: category.color,
              type: category.type,
              isDefault: category.is_default,
            })
            categoriesMigrated++
          } catch (error: any) {
            errors.push(`Error migrating category ${category.name}: ${error.message}`)
          }
        }
      }

      // Step 3: Migrate transactions
      setStep("Migrating transactions...")
      setProgress(60)

      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)

      if (transactionsError) {
        errors.push(`Error fetching transactions: ${transactionsError.message}`)
      } else if (transactions && transactions.length > 0) {
        const transactionsCollection = collection(db, "transactions")

        for (const transaction of transactions) {
          try {
            await setDoc(doc(transactionsCollection), {
              userId: user.id,
              title: transaction.title,
              amount: transaction.amount,
              categoryId: transaction.category_id?.toString(),
              transactionDate: Timestamp.fromDate(new Date(transaction.transaction_date)),
              notes: transaction.notes,
              createdAt: Timestamp.fromDate(new Date(transaction.created_at)),
              updatedAt: serverTimestamp(),
            })
            transactionsMigrated++
          } catch (error: any) {
            errors.push(`Error migrating transaction ${transaction.title}: ${error.message}`)
          }
        }
      }

      // Step 4: Migrate budget goals
      setStep("Migrating budget goals...")
      setProgress(90)

      const { data: budgetGoals, error: budgetGoalsError } = await supabase
        .from("budget_goals")
        .select("*")
        .eq("user_id", user.id)

      if (budgetGoalsError) {
        errors.push(`Error fetching budget goals: ${budgetGoalsError.message}`)
      } else if (budgetGoals && budgetGoals.length > 0) {
        const budgetGoalsCollection = collection(db, "budgetGoals")

        for (const goal of budgetGoals) {
          try {
            await setDoc(doc(budgetGoalsCollection), {
              userId: user.id,
              categoryId: goal.category_id?.toString(),
              amount: goal.amount,
              period: goal.period,
              startDate: Timestamp.fromDate(new Date(goal.start_date)),
              endDate: goal.end_date ? Timestamp.fromDate(new Date(goal.end_date)) : null,
              createdAt: Timestamp.fromDate(new Date(goal.created_at)),
              updatedAt: serverTimestamp(),
            })
            budgetGoalsMigrated++
          } catch (error: any) {
            errors.push(`Error migrating budget goal: ${error.message}`)
          }
        }
      }

      // Migration complete
      setStep("Migration complete!")
      setProgress(100)

      setMigrationResults({
        success: errors.length === 0,
        profileMigrated,
        categoriesMigrated,
        transactionsMigrated,
        budgetGoalsMigrated,
        errors,
      })

      if (errors.length === 0) {
        toast({
          title: "Migration successful",
          description: "Your data has been successfully migrated to Firestore.",
        })
      } else {
        toast({
          title: "Migration completed with errors",
          description: `${errors.length} errors occurred during migration.`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Migration failed",
        description: error.message,
        variant: "destructive",
      })

      setMigrationResults({
        success: false,
        profileMigrated,
        categoriesMigrated,
        transactionsMigrated,
        budgetGoalsMigrated,
        errors: [error.message],
      })
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Migration</CardTitle>
        <CardDescription>Migrate your data from Supabase to Firestore</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="font-medium">Migration Information</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            This utility will migrate your data from Supabase to Firestore. This process:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Migrates your user profile</li>
            <li>Migrates all your categories</li>
            <li>Migrates all your transactions</li>
            <li>Migrates all your budget goals</li>
            <li>Preserves all relationships between your data</li>
          </ul>
        </div>

        {isMigrating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{step}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {migrationResults && (
          <Alert variant={migrationResults.success ? "default" : "destructive"}>
            <div className="flex items-center gap-2">
              {migrationResults.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>Migration Results</AlertTitle>
            </div>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <p>User profile: {migrationResults.profileMigrated ? "Migrated" : "Failed"}</p>
                <p>Categories: {migrationResults.categoriesMigrated} migrated</p>
                <p>Transactions: {migrationResults.transactionsMigrated} migrated</p>
                <p>Budget goals: {migrationResults.budgetGoalsMigrated} migrated</p>
              </div>

              {migrationResults.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc pl-5 mt-1 text-sm">
                    {migrationResults.errors.slice(0, 3).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  {migrationResults.errors.length > 3 && (
                    <p className="text-sm mt-1">...and {migrationResults.errors.length - 3} more errors</p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={startMigration} disabled={isMigrating} className="w-full">
          {isMigrating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Migrating...
            </>
          ) : (
            "Start Migration"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
