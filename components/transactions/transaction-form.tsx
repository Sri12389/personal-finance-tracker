"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon, AlertCircle } from "lucide-react"
import { useDatabase } from "@/contexts/database-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getCategoryIcon } from "@/lib/utils"

const formSchema = z.object({
  title: z
    .string()
    .min(2, {
      message: "Title must be at least 2 characters.",
    })
    .max(100, {
      message: "Title cannot exceed 100 characters.",
    }),
  amount: z
    .string()
    .refine((val) => !isNaN(Number(val)), {
      message: "Amount must be a number.",
    })
    .refine((val) => Number(val) !== 0, {
      message: "Amount cannot be zero.",
    })
    .refine((val) => Number(val) <= 1000000, {
      message: "Amount cannot exceed 1,000,000.",
    }),
  category_id: z.string({
    required_error: "Please select a category.",
  }),
  transaction_date: z.date({
    required_error: "Please select a date.",
  }),
  notes: z
    .string()
    .max(500, {
      message: "Notes cannot exceed 500 characters.",
    })
    .optional(),
})

export function TransactionForm() {
  const [categories, setCategories] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { databaseType, getCategories, addTransaction } = useDatabase()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "",
      notes: "",
      transaction_date: new Date(),
    },
  })

  useEffect(() => {
    async function fetchCategories() {
      try {
        const data = await getCategories()
        setCategories(data)
      } catch (err: any) {
        setError(err.message || "Failed to load categories")
        toast({
          title: "Error",
          description: "Failed to load categories. Please refresh the page.",
          variant: "destructive",
        })
      }
    }

    fetchCategories()
  }, [getCategories])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    setError(null)

    try {
      // Get the selected category to determine if it's income or expense
      const selectedCategory = categories.find(
        (cat) =>
          cat.id === values.category_id ||
          cat.id === Number(values.category_id) ||
          cat.id === String(values.category_id),
      )

      if (!selectedCategory) {
        throw new Error("Selected category not found. Please try again.")
      }

      // Adjust amount sign based on category type
      let amount = Number.parseFloat(values.amount)
      if (selectedCategory?.type === "expense") {
        amount = -Math.abs(amount) // Make sure expenses are negative
      } else {
        amount = Math.abs(amount) // Make sure income is positive
      }

      // Prepare transaction data based on database type
      let transactionData: any = {}

      if (databaseType === "firestore") {
        transactionData = {
          title: values.title,
          amount,
          categoryId: values.category_id,
          transactionDate: values.transaction_date,
          notes: values.notes || null,
        }
      } else {
        transactionData = {
          title: values.title,
          amount,
          category_id: Number.parseInt(values.category_id),
          transaction_date: values.transaction_date.toISOString(),
          notes: values.notes || null,
        }
      }

      await addTransaction(transactionData)

      toast({
        title: "Transaction added",
        description: "Your transaction has been successfully added.",
      })

      // Reset form
      form.reset({
        title: "",
        amount: "",
        notes: "",
        transaction_date: new Date(),
      })
    } catch (error: any) {
      console.error("Error adding transaction:", error)
      setError(error.message || "There was an error adding your transaction.")
      toast({
        title: "Error",
        description: error.message || "There was an error adding your transaction.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Transaction</CardTitle>
        <CardDescription>Record a new income or expense transaction</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Grocery shopping" {...field} />
                    </FormControl>
                    <FormDescription>A short description of the transaction</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                        <Input placeholder="100.00" type="number" step="0.01" className="pl-8" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>The amount will be adjusted based on the category type</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <div className="space-y-1 p-2">
                          <h4 className="text-sm font-semibold">Income</h4>
                          {categories
                            .filter((cat) => cat.type === "income")
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="flex h-6 w-6 items-center justify-center rounded-full"
                                    style={{ backgroundColor: category.color || "#e2e8f0" }}
                                  >
                                    {getCategoryIcon(category.icon)}
                                  </span>
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </div>
                        <div className="space-y-1 p-2">
                          <h4 className="text-sm font-semibold">Expenses</h4>
                          {categories
                            .filter((cat) => cat.type === "expense")
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span
                                    className="flex h-6 w-6 items-center justify-center rounded-full"
                                    style={{ backgroundColor: category.color || "#e2e8f0" }}
                                  >
                                    {getCategoryIcon(category.icon)}
                                  </span>
                                  <span>{category.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </div>
                      </SelectContent>
                    </Select>
                    <FormDescription>Select whether this is income or an expense</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={"w-full pl-3 text-left font-normal"}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>The date when the transaction occurred</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the transaction"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Add any additional information about this transaction</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
