"use client"

import { useDatabase } from "@/contexts/database-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { DatabaseMigration } from "./database-migration"

export function DatabaseSettings() {
  const { databaseType, setDatabaseType } = useDatabase()

  const handleDatabaseChange = (value: "supabase" | "firestore") => {
    setDatabaseType(value)
    toast({
      title: "Database changed",
      description: `You are now using ${value === "supabase" ? "Supabase" : "Firestore"} as your database.`,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Database Settings</CardTitle>
          <CardDescription>Choose which database to use for storing your financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={databaseType}
            onValueChange={(value) => handleDatabaseChange(value as "supabase" | "firestore")}
            className="space-y-4"
          >
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="supabase" id="supabase" />
              <div className="grid gap-1.5">
                <Label htmlFor="supabase" className="font-medium">
                  Supabase
                </Label>
                <p className="text-sm text-muted-foreground">
                  PostgreSQL-based database with robust SQL capabilities. Default option.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <RadioGroupItem value="firestore" id="firestore" />
              <div className="grid gap-1.5">
                <Label htmlFor="firestore" className="font-medium">
                  Firestore
                </Label>
                <p className="text-sm text-muted-foreground">
                  NoSQL database from Firebase with real-time capabilities and offline support.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {databaseType === "firestore" && <DatabaseMigration />}
    </div>
  )
}
