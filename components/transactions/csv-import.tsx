"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { getBrowserClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { Upload, AlertCircle, CheckCircle, RefreshCw } from "lucide-react"
import Papa from "papaparse"

const formSchema = z.object({
  csvFile: z.instanceof(FileList).refine((files) => files.length === 1, {
    message: "Please select a CSV file.",
  }),
})

type CSVTransaction = {
  title: string
  amount: string
  category: string
  date: string
  notes?: string
}

export function CSVImport() {
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: number
    failed: number
    total: number
    errors: string[]
  } | null>(null)
  const supabase = getBrowserClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsImporting(true)
    setImportResults(null)

    try {
      const file = values.csvFile[0]

      // Parse CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const transactions = results.data as CSVTransaction[]
          const errors: string[] = []
          let successCount = 0
          let failedCount = 0

          // Fetch categories for mapping
          const { data: categories, error: categoriesError } = await supabase
            .from("categories")
            .select("id, name, type")

          if (categoriesError) {
            throw categoriesError
          }

          // Process each transaction
          for (const transaction of transactions) {
            try {
              // Find matching category
              const category = categories?.find((c) => c.name.toLowerCase() === transaction.category.toLowerCase())

              if (!category) {
                errors.push(`Category "${transaction.category}" not found for transaction "${transaction.title}"`)
                failedCount++
                continue
              }

              // Parse amount
              let amount = Number.parseFloat(transaction.amount.replace(/[^0-9.-]+/g, ""))

              // Adjust sign based on category type
              if (category.type === "expense" && amount > 0) {
                amount = -amount
              } else if (category.type === "income" && amount < 0) {
                amount = Math.abs(amount)
              }

              // Parse date
              let transactionDate: Date
              try {
                transactionDate = new Date(transaction.date)
                if (isNaN(transactionDate.getTime())) {
                  throw new Error("Invalid date")
                }
              } catch (e) {
                errors.push(`Invalid date "${transaction.date}" for transaction "${transaction.title}"`)
                failedCount++
                continue
              }

              // Insert transaction
              const { error: insertError } = await supabase.from("transactions").insert({
                title: transaction.title,
                amount,
                category_id: category.id,
                transaction_date: transactionDate.toISOString(),
                notes: transaction.notes || null,
              })

              if (insertError) {
                errors.push(`Error inserting transaction "${transaction.title}": ${insertError.message}`)
                failedCount++
              } else {
                successCount++
              }
            } catch (error: any) {
              errors.push(`Error processing transaction "${transaction.title}": ${error.message}`)
              failedCount++
            }
          }

          // Show results
          setImportResults({
            success: successCount,
            failed: failedCount,
            total: transactions.length,
            errors: errors.slice(0, 5), // Limit to first 5 errors
          })

          if (successCount > 0) {
            toast({
              title: "Import completed",
              description: `Successfully imported ${successCount} of ${transactions.length} transactions.`,
            })
          } else {
            toast({
              title: "Import failed",
              description: "No transactions were imported. Please check the error messages.",
              variant: "destructive",
            })
          }
        },
        error: (error) => {
          toast({
            title: "CSV parsing error",
            description: error.message,
            variant: "destructive",
          })
          setImportResults({
            success: 0,
            failed: 0,
            total: 0,
            errors: [error.message],
          })
        },
      })
    } catch (error: any) {
      toast({
        title: "Import error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
      form.reset()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Transactions</CardTitle>
        <CardDescription>Upload a CSV file to import multiple transactions at once</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="csvFile"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>CSV File</FormLabel>
                  <FormControl>
                    <Input type="file" accept=".csv" onChange={(e) => onChange(e.target.files)} {...rest} />
                  </FormControl>
                  <FormDescription>
                    The CSV file should have columns: title, amount, category, date, notes (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {importResults && (
              <Alert variant={importResults.failed === 0 ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {importResults.failed === 0 ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>Import Results</AlertTitle>
                </div>
                <AlertDescription>
                  <p className="mt-2">
                    Successfully imported {importResults.success} of {importResults.total} transactions.
                    {importResults.failed > 0 && ` Failed to import ${importResults.failed} transactions.`}
                  </p>
                  {importResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc pl-5 mt-1 text-sm">
                        {importResults.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                      {importResults.errors.length < importResults.failed && (
                        <p className="text-sm mt-1">
                          ...and {importResults.failed - importResults.errors.length} more errors
                        </p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isImporting}>
              {isImporting ? (
                <>
                  <span className="animate-spin mr-2">
                    <RefreshCw className="h-4 w-4" />
                  </span>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Transactions
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-start">
        <h3 className="text-sm font-medium mb-2">CSV Format Example:</h3>
        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto w-full">
          title,amount,category,date,notes
          <br />
          "Grocery Shopping","-120.50","Food","2023-05-15","Weekly groceries"
          <br />
          "Salary","3000","Salary","2023-05-01","Monthly salary"
        </pre>
      </CardFooter>
    </Card>
  )
}
