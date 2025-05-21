"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { transactionService, categoryService, type Transaction, type Category } from "@/lib/firestore-service"
import { useAuth } from "@/contexts/auth-context"

type TransactionWithCategory = Transaction & {
  category?: Category
}

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) !== 0, {
    message: "Amount must be a non-zero number.",
  }),
  categoryId: z.string({
    required_error: "Please select a category.",
  }),
  transactionDate: z.date({
    required_error: "Please select a date.",
  }),
  notes: z.string().optional(),
})

interface EditTransactionDialogProps {
  isOpen: boolean
  onClose: () => void
  transaction: TransactionWithCategory | null
  onTransactionUpdated: () => void
}

export function EditTransactionDialog({
  isOpen,
  onClose,
  transaction,
  onTransactionUpdated,
}: EditTransactionDialogProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      amount: "",
      notes: "",
      transactionDate: new Date(),
    },
  })

  useEffect(() => {
    if (!user) return

    async function fetchCategories() {
      try {
        const data = await categoryService.getCategories(user.id)
        setCategories(data)
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }

    fetchCategories()
  }, [user])

  useEffect(() => {
    if (transaction && isOpen) {
      const amount = Math.abs(transaction.amount).toString()
      const date =
        transaction.transactionDate instanceof Date ? transaction.transactionDate : transaction.transactionDate.toDate()

      form.reset({
        title: transaction.title,
        amount,
        categoryId: transaction.categoryId,
        transactionDate: date,
        notes: transaction.notes || "",
      })
    }
  }, [transaction, isOpen, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!transaction?.id || !user) return

    setIsSubmitting(true)
    try {
      // Get the selected category to determine if it's income or expense
      const selectedCategory = categories.find((cat) => cat.id === values.categoryId)

      // Adjust amount sign based on category type
      let amount = Number.parseFloat(values.amount)
      if (selectedCategory?.type === "expense") {
        amount = -Math.abs(amount) // Make sure expenses are negative
      } else {
        amount = Math.abs(amount) // Make sure income is positive
      }

      await transactionService.updateTransaction(transaction.id, {
        title: values.title,
        amount,
        categoryId: values.categoryId,
        transactionDate: values.transactionDate,
        notes: values.notes || null,
      })

      toast({
        title: "Transaction updated",
        description: "Your transaction has been successfully updated.",
      })

      onTransactionUpdated()
      onClose()
    } catch (error) {
      console.error("Error updating transaction:", error)
      toast({
        title: "Error",
        description: "There was an error updating your transaction.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>Update the details of your transaction.</DialogDescription>
        </DialogHeader>
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
                      <Input placeholder="100.00" type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormDescription>The amount will be adjusted based on the category type</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
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
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                        </div>
                        <div className="space-y-1 p-2">
                          <h4 className="text-sm font-semibold">Expenses</h4>
                          {categories
                            .filter((cat) => cat.type === "expense")
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                name="transactionDate"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
