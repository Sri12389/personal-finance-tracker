"use client"

import { useState, useEffect } from "react"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { categoryService } from "@/lib/firestore-service"
import { useAuth } from "@/contexts/auth-context"
import { getCategoryIcon } from "@/lib/utils"
import { format } from "date-fns"
import type { Category } from "@/lib/firestore-service"

export type TransactionFilters = {
  search: string
  categoryId: string
  dateRange:
    | {
        from: Date
        to?: Date
      }
    | undefined
  sortField: string
  sortDirection: "asc" | "desc"
  amountRange: string
}

interface TransactionFiltersProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<TransactionFilters>(filters)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const { user } = useAuth()

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
    // Count active filters
    let count = 0
    if (filters.search) count++
    if (filters.categoryId !== "all") count++
    if (filters.dateRange) count++
    if (filters.amountRange !== "all") count++
    setActiveFiltersCount(count)
  }, [filters])

  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value }
    onFiltersChange(newFilters)
  }

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters)
    setIsOpen(false)
  }

  const handleResetFilters = () => {
    const resetFilters: TransactionFilters = {
      search: "",
      categoryId: "all",
      dateRange: undefined,
      sortField: "transactionDate",
      sortDirection: "desc",
      amountRange: "all",
    }
    setTempFilters(resetFilters)
    onFiltersChange(resetFilters)
    setIsOpen(false)
  }

  const clearFilter = (filterName: keyof TransactionFilters) => {
    const newFilters = { ...filters }

    if (filterName === "dateRange") {
      newFilters.dateRange = undefined
    } else if (filterName === "categoryId") {
      newFilters.categoryId = "all"
    } else if (filterName === "amountRange") {
      newFilters.amountRange = "all"
    } else if (filterName === "search") {
      newFilters.search = ""
    }

    onFiltersChange(newFilters)
  }

  const getAmountRangeLabel = (range: string) => {
    switch (range) {
      case "0-50":
        return "$0 - $50"
      case "50-100":
        return "$50 - $100"
      case "100-500":
        return "$100 - $500"
      case "500+":
        return "$500+"
      default:
        return "Any Amount"
    }
  }

  const getCategoryName = (id: string) => {
    if (id === "all") return "All Categories"
    const category = categories.find((c) => c.id === id || c.id === Number(id))
    return category ? category.name : "Unknown Category"
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full"
          />
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Transactions</SheetTitle>
              <SheetDescription>Apply filters to narrow down your transaction list</SheetDescription>
            </SheetHeader>

            <div className="py-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Category</h3>
                <Select
                  value={tempFilters.categoryId}
                  onValueChange={(value) => setTempFilters({ ...tempFilters, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <div className="space-y-1 p-2">
                      <h4 className="text-sm font-semibold">Income</h4>
                      {categories
                        .filter((cat) => cat.type === "income")
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full"
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
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full"
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
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Date Range</h3>
                <DateRangePicker
                  date={tempFilters.dateRange}
                  onDateChange={(range) => setTempFilters({ ...tempFilters, dateRange: range })}
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Amount Range</h3>
                <Select
                  value={tempFilters.amountRange}
                  onValueChange={(value) => setTempFilters({ ...tempFilters, amountRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any Amount" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Amount</SelectItem>
                    <SelectItem value="0-50">$0 - $50</SelectItem>
                    <SelectItem value="50-100">$50 - $100</SelectItem>
                    <SelectItem value="100-500">$100 - $500</SelectItem>
                    <SelectItem value="500+">$500+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sort By</h3>
                <Select
                  value={tempFilters.sortField}
                  onValueChange={(value) => setTempFilters({ ...tempFilters, sortField: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transactionDate">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sort Direction</h3>
                <Select
                  value={tempFilters.sortDirection}
                  onValueChange={(value) => setTempFilters({ ...tempFilters, sortDirection: value as "asc" | "desc" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <SheetFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset Filters
              </Button>
              <Button onClick={handleApplyFilters}>Apply Filters</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filters display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {filters.search}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => clearFilter("search")}>
                <X className="h-3 w-3" />
                <span className="sr-only">Clear search filter</span>
              </Button>
            </Badge>
          )}

          {filters.categoryId !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Category: {getCategoryName(filters.categoryId)}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => clearFilter("categoryId")}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear category filter</span>
              </Button>
            </Badge>
          )}

          {filters.dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Date: {format(filters.dateRange.from, "MMM d, yyyy")}
              {filters.dateRange.to && ` - ${format(filters.dateRange.to, "MMM d, yyyy")}`}
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1" onClick={() => clearFilter("dateRange")}>
                <X className="h-3 w-3" />
                <span className="sr-only">Clear date filter</span>
              </Button>
            </Badge>
          )}

          {filters.amountRange !== "all" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Amount: {getAmountRangeLabel(filters.amountRange)}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 ml-1"
                onClick={() => clearFilter("amountRange")}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear amount filter</span>
              </Button>
            </Badge>
          )}

          {activeFiltersCount > 1 && (
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={handleResetFilters}>
              Clear All
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
