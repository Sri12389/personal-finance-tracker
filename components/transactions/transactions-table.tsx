"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, MoreHorizontal, Trash2, Edit } from "lucide-react"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { TransactionFilters, type TransactionFilters as Filters } from "./transaction-filters"
import { useAuth } from "@/contexts/auth-context"
import { transactionService, categoryService, type Transaction, type Category } from "@/lib/firestore-service"
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"
import { getCategoryIcon } from "@/lib/utils" // Import getCategoryIcon

type TransactionWithCategory = Transaction & {
  category?: Category
}

export function TransactionsTable() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionWithCategory | null>(null)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    categoryId: "all",
    dateRange: undefined,
    sortField: "transactionDate",
    sortDirection: "desc",
    amountRange: "all",
  })
  const [categories, setCategories] = useState<Category[]>([])
  const { user } = useAuth()
  const pageSize = 10

  useEffect(() => {
    if (!user) return

    fetchCategories()
  }, [user])

  useEffect(() => {
    if (!user) return

    fetchTransactions()
  }, [user, currentPage, filters])

  async function fetchCategories() {
    try {
      const data = await categoryService.getCategories(user!.id)
      setCategories(data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  async function fetchTransactions() {
    setIsLoading(true)
    try {
      // Prepare options for the query
      const options: any = {
        limit: pageSize,
      }

      // Add category filter if selected
      if (filters.categoryId !== "all") {
        options.categoryId = filters.categoryId
      }

      // Add date range filter if provided
      if (filters.dateRange?.from) {
        options.startDate = filters.dateRange.from

        if (filters.dateRange.to) {
          options.endDate = filters.dateRange.to
        }
      }

      // Add pagination
      if (currentPage > 1 && lastDoc) {
        options.lastDoc = lastDoc
      } else if (currentPage > 1 && !lastDoc) {
        // If we don't have a lastDoc but trying to go to a page > 1,
        // we need to fetch all previous pages first
        let tempLastDoc
        for (let i = 1; i < currentPage; i++) {
          const tempOptions = { ...options, limit: pageSize }
          if (tempLastDoc) {
            tempOptions.lastDoc = tempLastDoc
          }

          const { transactions: tempTransactions, lastDoc: newLastDoc } = await transactionService.getTransactions(
            user!.id,
            tempOptions,
          )

          tempLastDoc = newLastDoc
        }

        options.lastDoc = tempLastDoc
      }

      // Fetch transactions
      const { transactions: fetchedTransactions, lastDoc: newLastDoc } = await transactionService.getTransactions(
        user!.id,
        options,
      )

      // Set the last document for pagination
      setLastDoc(newLastDoc)

      // Fetch categories for each transaction
      let transactionsWithCategories = await Promise.all(
        fetchedTransactions.map(async (transaction) => {
          if (transaction.categoryId) {
            const category =
              categories.find((c) => c.id === transaction.categoryId) ||
              (await categoryService.getCategory(transaction.categoryId))

            return { ...transaction, category }
          }

          return transaction
        }),
      )

      // Apply client-side filtering for search and amount range
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        transactionsWithCategories = transactionsWithCategories.filter(
          (tx) =>
            tx.title.toLowerCase().includes(searchLower) ||
            (tx.notes && tx.notes.toLowerCase().includes(searchLower)) ||
            (tx.category && tx.category.name.toLowerCase().includes(searchLower)),
        )
      }

      if (filters.amountRange !== "all") {
        transactionsWithCategories = transactionsWithCategories.filter((tx) => {
          const amount = Math.abs(Number(tx.amount))
          switch (filters.amountRange) {
            case "0-50":
              return amount >= 0 && amount <= 50
            case "50-100":
              return amount > 50 && amount <= 100
            case "100-500":
              return amount > 100 && amount <= 500
            case "500+":
              return amount > 500
            default:
              return true
          }
        })
      }

      setTransactions(transactionsWithCategories)

      // Calculate total pages
      // This is an approximation since we don't have a count query
      // In a real app, you might want to implement a more accurate pagination
      setTotalPages(Math.max(currentPage, 1))
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error",
        description: "Failed to load transactions.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteTransaction() {
    if (!transactionToDelete) return

    try {
      await transactionService.deleteTransaction(transactionToDelete)

      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      })

      // Refresh transactions
      fetchTransactions()
    } catch (error) {
      console.error("Error deleting transaction:", error)
      toast({
        title: "Error",
        description: "Failed to delete the transaction.",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setTransactionToDelete(null)
    }
  }

  function confirmDelete(id: string) {
    setTransactionToDelete(id)
    setDeleteDialogOpen(true)
  }

  function openEditDialog(transaction: TransactionWithCategory) {
    setTransactionToEdit(transaction)
    setEditDialogOpen(true)
  }

  function handleFiltersChange(newFilters: Filters) {
    setFilters(newFilters)
    setCurrentPage(1)
    setLastDoc(undefined)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
        <CardDescription>View, search, and manage your transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <TransactionFilters filters={filters} onFiltersChange={handleFiltersChange} />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Notes</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => {
                  const isIncome = transaction.category?.type === "income"
                  const amount = transaction.amount

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.title}</TableCell>
                      <TableCell className={isIncome ? "text-green-500" : "text-red-500"}>
                        {isIncome ? "+" : ""}
                        {formatCurrency(amount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {transaction.category && (
                            <span
                              className="flex h-5 w-5 items-center justify-center rounded-full"
                              style={{ backgroundColor: transaction.category.color || "#e2e8f0" }}
                            >
                              {getCategoryIcon(transaction.category.icon)}
                            </span>
                          )}
                          <span>{transaction.category?.name || "Uncategorized"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(
                          transaction.transactionDate instanceof Date
                            ? transaction.transactionDate
                            : transaction.transactionDate.toDate(),
                          "MMM d, yyyy",
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {transaction.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => confirmDelete(transaction.id!)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={transactions.length < pageSize || isLoading}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTransaction}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Transaction Dialog */}
        <EditTransactionDialog
          isOpen={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          transaction={transactionToEdit}
          onTransactionUpdated={fetchTransactions}
        />
      </CardContent>
    </Card>
  )
}
