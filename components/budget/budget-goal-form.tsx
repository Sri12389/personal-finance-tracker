"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function BudgetGoalForm() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    period: "monthly",
  })
  const { user } = useAuth()
  const supabase = getBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchCategories = async () => {
      if (!user) return

      setLoading(true)
      setError(null)

      try {
        // Fetch expense categories
        const { data, error } = await supabase.from("categories").select("*").eq("type", "expense").order("name")

        if (error) throw new Error(`Error fetching categories: ${error.message}`)

        setCategories(data || [])
      } catch (err: any) {
        console.error("Error fetching categories:", err)
        setError(err.message || "Failed to load categories")
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [user, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSubmitting(true)
    setError(null)

    try {
      // Validate form data
      if (!formData.categoryId) throw new Error("Please select a category")
      if (!formData.amount || Number.parseFloat(formData.amount) <= 0) throw new Error("Please enter a valid amount")

      // Get the current month's date range
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      // Create the budget goal
      const { error } = await supabase.from("budget_goals").insert({
        user_id: user.id,
        category_id: formData.categoryId,
        amount: Number.parseFloat(formData.amount),
        period: formData.period,
        start_date: startOfMonth.toISOString(),
        end_date: endOfMonth.toISOString(),
      })

      if (error) throw new Error(`Error creating budget goal: ${error.message}`)

      // Reset the form
      setFormData({
        categoryId: "",
        amount: "",
        period: "monthly",
      })

      toast({
        title: "Budget Goal Created",
        description: "Your budget goal has been created successfully.",
      })

      // You could add a callback here to refresh the budget goals list
    } catch (err: any) {
      console.error("Error creating budget goal:", err)
      setError(err.message || "Failed to create budget goal")

      toast({
        title: "Error",
        description: err.message || "Failed to create budget goal",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error && !submitting) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <CardTitle className="text-red-700">Budget Goal Form Error</CardTitle>
          </div>
          <CardDescription className="text-red-600">
            We encountered a problem loading the budget goal form
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-red-500">
            Please try refreshing the page. If the problem persists, contact support.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Budget Goal</CardTitle>
        <CardDescription>Set a new budget goal for a category</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Budget Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                className="pl-8"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select value={formData.period} onValueChange={(value) => setFormData({ ...formData, period: value })}>
              <SelectTrigger id="period">
                <SelectValue placeholder="Select a period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && submitting && <div className="text-sm text-red-500 mt-2">{error}</div>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating..." : "Create Budget Goal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
