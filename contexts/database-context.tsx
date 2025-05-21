"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { getBrowserClient } from "@/lib/supabase"
import * as firestoreService from "@/lib/firestore-service"
import { useToast } from "@/components/ui/use-toast"

type DatabaseType = "supabase" | "firestore"

interface DatabaseContextType {
  databaseType: DatabaseType
  setDatabaseType: (type: DatabaseType) => void
  isLoading: boolean
  getTransactions: (options?: any) => Promise<any[]>
  getTransaction: (id: string) => Promise<any>
  createTransaction: (data: any) => Promise<any>
  updateTransaction: (id: string, data: any) => Promise<any>
  deleteTransaction: (id: string) => Promise<void>
  getCategories: () => Promise<any[]>
  getCategory: (id: string) => Promise<any>
  createCategory: (data: any) => Promise<any>
  updateCategory: (id: string, data: any) => Promise<any>
  deleteCategory: (id: string) => Promise<void>
  getBudgetGoals: () => Promise<any[]>
  getBudgetGoal: (id: string) => Promise<any>
  createBudgetGoal: (data: any) => Promise<any>
  updateBudgetGoal: (id: string, data: any) => Promise<any>
  deleteBudgetGoal: (id: string) => Promise<void>
  getUserProfile: () => Promise<any>
  updateUserProfile: (data: any) => Promise<any>
  getFinancialSummary: (options: { startDate: Date; endDate: Date }) => Promise<{
    income: number
    expenses: number
    balance: number
  }>
  migrateData: () => Promise<{
    success: boolean
    message: string
    details?: {
      profile?: boolean
      categories?: boolean
      transactions?: boolean
      budgetGoals?: boolean
    }
  }>
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined)

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [databaseType, setDatabaseType] = useState<DatabaseType>("supabase")
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = getBrowserClient()

  // Load saved preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedType = localStorage.getItem("preferredDatabase") as DatabaseType
      if (savedType && (savedType === "supabase" || savedType === "firestore")) {
        setDatabaseType(savedType)
      }
    }
  }, [])

  // Save preference to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredDatabase", databaseType)
    }
  }, [databaseType])

  // Transactions
  const getTransactions = useCallback(
    async (options?: {
      startDate?: Date
      endDate?: Date
      categoryId?: string
      search?: string
      limit?: number
      sortField?: string
      sortDirection?: "asc" | "desc"
    }) => {
      if (!user) return []
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          let query = supabase
            .from("transactions")
            .select(
              `
              *,
              category:categories(*)
            `,
            )
            .order(options?.sortField || "transaction_date", {
              ascending: options?.sortDirection === "asc",
            })

          if (options?.startDate) {
            query = query.gte("transaction_date", options.startDate.toISOString())
          }

          if (options?.endDate) {
            query = query.lte("transaction_date", options.endDate.toISOString())
          }

          if (options?.categoryId && options.categoryId !== "all") {
            query = query.eq("category_id", options.categoryId)
          }

          if (options?.search) {
            query = query.ilike("title", `%${options.search}%`)
          }

          if (options?.limit) {
            query = query.limit(options.limit)
          }

          const { data, error } = await query

          if (error) {
            console.error("Error fetching transactions from Supabase:", error)
            throw error
          }

          return data || []
        } else {
          // Firestore
          return await firestoreService.transactionService.getTransactions(user.id, options)
        }
      } catch (error) {
        console.error("Error in getTransactions:", error)
        toast({
          title: "Error fetching transactions",
          description: "Please try again later",
          variant: "destructive",
        })
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const getTransaction = useCallback(
    async (id: string) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data, error } = await supabase
            .from("transactions")
            .select(
              `
              *,
              category:categories(*)
            `,
            )
            .eq("id", id)
            .single()

          if (error) throw error
          return data
        } else {
          // Firestore
          return await firestoreService.transactionService.getTransaction(user.id, id)
        }
      } catch (error) {
        console.error("Error in getTransaction:", error)
        toast({
          title: "Error fetching transaction",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const createTransaction = useCallback(
    async (data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: newTransaction, error } = await supabase
            .from("transactions")
            .insert({
              ...data,
              user_id: user.id,
            })
            .select()
            .single()

          if (error) throw error
          return newTransaction
        } else {
          // Firestore
          return await firestoreService.transactionService.createTransaction(user.id, data)
        }
      } catch (error) {
        console.error("Error in createTransaction:", error)
        toast({
          title: "Error creating transaction",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const updateTransaction = useCallback(
    async (id: string, data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: updatedTransaction, error } = await supabase
            .from("transactions")
            .update(data)
            .eq("id", id)
            .select()
            .single()

          if (error) throw error
          return updatedTransaction
        } else {
          // Firestore
          return await firestoreService.transactionService.updateTransaction(user.id, id, data)
        }
      } catch (error) {
        console.error("Error in updateTransaction:", error)
        toast({
          title: "Error updating transaction",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const deleteTransaction = useCallback(
    async (id: string) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { error } = await supabase.from("transactions").delete().eq("id", id)
          if (error) throw error
        } else {
          // Firestore
          await firestoreService.transactionService.deleteTransaction(user.id, id)
        }
      } catch (error) {
        console.error("Error in deleteTransaction:", error)
        toast({
          title: "Error deleting transaction",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  // Categories
  const getCategories = useCallback(async () => {
    if (!user) return []
    setIsLoading(true)

    try {
      if (databaseType === "supabase") {
        const { data, error } = await supabase.from("categories").select("*").order("name")

        if (error) {
          console.error("Error fetching categories from Supabase:", error)
          throw error
        }

        return data || []
      } else {
        // Firestore
        return await firestoreService.categoryService.getCategories(user.id)
      }
    } catch (error) {
      console.error("Error in getCategories:", error)
      toast({
        title: "Error fetching categories",
        description: "Please try again later",
        variant: "destructive",
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [user, databaseType, supabase, toast])

  const getCategory = useCallback(
    async (id: string) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data, error } = await supabase.from("categories").select("*").eq("id", id).single()
          if (error) throw error
          return data
        } else {
          // Firestore
          return await firestoreService.categoryService.getCategory(user.id, id)
        }
      } catch (error) {
        console.error("Error in getCategory:", error)
        toast({
          title: "Error fetching category",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const createCategory = useCallback(
    async (data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: newCategory, error } = await supabase
            .from("categories")
            .insert({
              ...data,
              user_id: user.id,
            })
            .select()
            .single()

          if (error) throw error
          return newCategory
        } else {
          // Firestore
          return await firestoreService.categoryService.createCategory(user.id, data)
        }
      } catch (error) {
        console.error("Error in createCategory:", error)
        toast({
          title: "Error creating category",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const updateCategory = useCallback(
    async (id: string, data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: updatedCategory, error } = await supabase
            .from("categories")
            .update(data)
            .eq("id", id)
            .select()
            .single()

          if (error) throw error
          return updatedCategory
        } else {
          // Firestore
          return await firestoreService.categoryService.updateCategory(user.id, id, data)
        }
      } catch (error) {
        console.error("Error in updateCategory:", error)
        toast({
          title: "Error updating category",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { error } = await supabase.from("categories").delete().eq("id", id)
          if (error) throw error
        } else {
          // Firestore
          await firestoreService.categoryService.deleteCategory(user.id, id)
        }
      } catch (error) {
        console.error("Error in deleteCategory:", error)
        toast({
          title: "Error deleting category",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  // Budget Goals
  const getBudgetGoals = useCallback(async () => {
    if (!user) return []
    setIsLoading(true)

    try {
      if (databaseType === "supabase") {
        const { data, error } = await supabase
          .from("budget_goals")
          .select(
            `
            *,
            category:categories(*)
          `,
          )
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching budget goals from Supabase:", error)
          throw error
        }

        return data || []
      } else {
        // Firestore
        return await firestoreService.budgetGoalService.getBudgetGoals(user.id)
      }
    } catch (error) {
      console.error("Error in getBudgetGoals:", error)
      toast({
        title: "Error fetching budget goals",
        description: "Please try again later",
        variant: "destructive",
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [user, databaseType, supabase, toast])

  const getBudgetGoal = useCallback(
    async (id: string) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data, error } = await supabase
            .from("budget_goals")
            .select(
              `
              *,
              category:categories(*)
            `,
            )
            .eq("id", id)
            .single()

          if (error) throw error
          return data
        } else {
          // Firestore
          return await firestoreService.budgetGoalService.getBudgetGoal(user.id, id)
        }
      } catch (error) {
        console.error("Error in getBudgetGoal:", error)
        toast({
          title: "Error fetching budget goal",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const createBudgetGoal = useCallback(
    async (data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: newBudgetGoal, error } = await supabase
            .from("budget_goals")
            .insert({
              ...data,
              user_id: user.id,
            })
            .select()
            .single()

          if (error) throw error
          return newBudgetGoal
        } else {
          // Firestore
          return await firestoreService.budgetGoalService.createBudgetGoal(user.id, data)
        }
      } catch (error) {
        console.error("Error in createBudgetGoal:", error)
        toast({
          title: "Error creating budget goal",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const updateBudgetGoal = useCallback(
    async (id: string, data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: updatedBudgetGoal, error } = await supabase
            .from("budget_goals")
            .update(data)
            .eq("id", id)
            .select()
            .single()

          if (error) throw error
          return updatedBudgetGoal
        } else {
          // Firestore
          return await firestoreService.budgetGoalService.updateBudgetGoal(user.id, id, data)
        }
      } catch (error) {
        console.error("Error in updateBudgetGoal:", error)
        toast({
          title: "Error updating budget goal",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  const deleteBudgetGoal = useCallback(
    async (id: string) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { error } = await supabase.from("budget_goals").delete().eq("id", id)
          if (error) throw error
        } else {
          // Firestore
          await firestoreService.budgetGoalService.deleteBudgetGoal(user.id, id)
        }
      } catch (error) {
        console.error("Error in deleteBudgetGoal:", error)
        toast({
          title: "Error deleting budget goal",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  // User Profile
  const getUserProfile = useCallback(async () => {
    if (!user) throw new Error("User not authenticated")
    setIsLoading(true)

    try {
      if (databaseType === "supabase") {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (error) throw error
        return data
      } else {
        // Firestore
        return await firestoreService.userProfileService.getUserProfile(user.id)
      }
    } catch (error) {
      console.error("Error in getUserProfile:", error)
      toast({
        title: "Error fetching user profile",
        description: "Please try again later",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, databaseType, supabase, toast])

  const updateUserProfile = useCallback(
    async (data: any) => {
      if (!user) throw new Error("User not authenticated")
      setIsLoading(true)

      try {
        if (databaseType === "supabase") {
          const { data: updatedProfile, error } = await supabase
            .from("profiles")
            .update(data)
            .eq("id", user.id)
            .select()
            .single()

          if (error) throw error
          return updatedProfile
        } else {
          // Firestore
          return await firestoreService.userProfileService.updateUserProfile(user.id, data)
        }
      } catch (error) {
        console.error("Error in updateUserProfile:", error)
        toast({
          title: "Error updating user profile",
          description: "Please try again later",
          variant: "destructive",
        })
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  // Financial Summary
  const getFinancialSummary = useCallback(
    async (options: { startDate: Date; endDate: Date }) => {
      if (!user) {
        return { income: 0, expenses: 0, balance: 0 }
      }

      try {
        setIsLoading(true)
        let transactions = []

        if (databaseType === "supabase") {
          const { data, error } = await supabase
            .from("transactions")
            .select("*")
            .gte("transaction_date", options.startDate.toISOString())
            .lte("transaction_date", options.endDate.toISOString())

          if (error) {
            console.error("Error fetching transactions for summary:", error)
            throw error
          }

          transactions = data || []
        } else {
          // Firestore
          transactions = await firestoreService.transactionService.getTransactions(user.id, {
            startDate: options.startDate,
            endDate: options.endDate,
          })
        }

        // Calculate totals
        let income = 0
        let expenses = 0

        transactions.forEach((transaction: any) => {
          const amount = Number(transaction.amount)
          if (amount > 0) {
            income += amount
          } else {
            expenses += Math.abs(amount)
          }
        })

        return {
          income,
          expenses,
          balance: income - expenses,
        }
      } catch (error) {
        console.error("Error calculating financial summary:", error)
        toast({
          title: "Error calculating financial summary",
          description: "Please try again later",
          variant: "destructive",
        })
        return { income: 0, expenses: 0, balance: 0 }
      } finally {
        setIsLoading(false)
      }
    },
    [user, databaseType, supabase, toast],
  )

  // Data Migration
  const migrateData = useCallback(async () => {
    if (!user) {
      throw new Error("User not authenticated")
    }

    setIsLoading(true)
    try {
      // Get data from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 is "no rows returned" which is fine for new users
        console.error("Error fetching profile data:", profileError)
        throw profileError
      }

      const { data: categoriesData, error: categoriesError } = await supabase.from("categories").select("*")

      if (categoriesError) {
        console.error("Error fetching categories data:", categoriesError)
        throw categoriesError
      }

      const { data: transactionsData, error: transactionsError } = await supabase.from("transactions").select("*")

      if (transactionsError) {
        console.error("Error fetching transactions data:", transactionsError)
        throw transactionsError
      }

      const { data: budgetGoalsData, error: budgetGoalsError } = await supabase.from("budget_goals").select("*")

      if (budgetGoalsError) {
        console.error("Error fetching budget goals data:", budgetGoalsError)
        throw budgetGoalsError
      }

      // Migrate to Firestore
      const results = {
        profile: false,
        categories: false,
        transactions: false,
        budgetGoals: false,
      }

      // Migrate profile
      if (profileData) {
        await firestoreService.userProfileService.createUserProfile(user.id, {
          ...profileData,
          id: user.id,
        })
        results.profile = true
      }

      // Migrate categories
      if (categoriesData && categoriesData.length > 0) {
        for (const category of categoriesData) {
          await firestoreService.categoryService.createCategory(user.id, {
            ...category,
            userId: user.id,
          })
        }
        results.categories = true
      }

      // Migrate transactions
      if (transactionsData && transactionsData.length > 0) {
        for (const transaction of transactionsData) {
          await firestoreService.transactionService.createTransaction(user.id, {
            ...transaction,
            userId: user.id,
            transactionDate: new Date(transaction.transaction_date),
          })
        }
        results.transactions = true
      }

      // Migrate budget goals
      if (budgetGoalsData && budgetGoalsData.length > 0) {
        for (const budgetGoal of budgetGoalsData) {
          await firestoreService.budgetGoalService.createBudgetGoal(user.id, {
            ...budgetGoal,
            userId: user.id,
          })
        }
        results.budgetGoals = true
      }

      return {
        success: true,
        message: "Data migration completed successfully",
        details: results,
      }
    } catch (error) {
      console.error("Error during data migration:", error)
      return {
        success: false,
        message: "Data migration failed",
      }
    } finally {
      setIsLoading(false)
    }
  }, [user, supabase])

  const value = {
    databaseType,
    setDatabaseType,
    isLoading,
    getTransactions,
    getTransaction,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    getBudgetGoals,
    getBudgetGoal,
    createBudgetGoal,
    updateBudgetGoal,
    deleteBudgetGoal,
    getUserProfile,
    updateUserProfile,
    getFinancialSummary,
    migrateData,
  }

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

export const useDatabase = () => {
  const context = useContext(DatabaseContext)
  if (context === undefined) {
    throw new Error("useDatabase must be used within a DatabaseProvider")
  }
  return context
}
