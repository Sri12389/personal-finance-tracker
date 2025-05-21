import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { db } from "./firebase"

// Types
export type Transaction = {
  id?: string
  userId: string
  title: string
  amount: number
  categoryId: string
  transactionDate: Date | Timestamp
  notes?: string
  createdAt?: Date | Timestamp
  updatedAt?: Date | Timestamp
}

export type Category = {
  id?: string
  userId: string
  name: string
  icon?: string
  color?: string
  type: "income" | "expense"
  isDefault?: boolean
}

export type BudgetGoal = {
  id?: string
  userId: string
  categoryId: string
  amount: number
  period: "daily" | "weekly" | "monthly" | "yearly"
  startDate: Date | Timestamp
  endDate?: Date | Timestamp
  createdAt?: Date | Timestamp
  updatedAt?: Date | Timestamp
}

export type UserProfile = {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  createdAt?: Date | Timestamp
  updatedAt?: Date | Timestamp
}

// Helper functions
const convertTimestamps = (data: any): any => {
  const result = { ...data }

  // Convert Firestore Timestamps to JavaScript Dates
  Object.keys(result).forEach((key) => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate()
    }
  })

  return result
}

const prepareForFirestore = (data: any): any => {
  const result = { ...data }

  // Convert JavaScript Dates to Firestore Timestamps
  Object.keys(result).forEach((key) => {
    if (result[key] instanceof Date) {
      result[key] = Timestamp.fromDate(result[key])
    }
  })

  // Remove undefined values
  Object.keys(result).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key]
    }
  })

  return result
}

// User Profile Service
export const userProfileService = {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, "users", userId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as UserProfile
      }

      return null
    } catch (error) {
      console.error("Error getting user profile:", error)
      throw error
    }
  },

  async updateProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const docRef = doc(db, "users", userId)
      await updateDoc(docRef, {
        ...prepareForFirestore(data),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  },
}

// Transaction Service
export const transactionService = {
  async getTransactions(
    userId: string,
    options?: {
      categoryId?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      lastDoc?: QueryDocumentSnapshot<DocumentData>
    },
  ): Promise<{ transactions: Transaction[]; lastDoc?: QueryDocumentSnapshot<DocumentData> }> {
    try {
      const transactionsRef = collection(db, "transactions")
      let q = query(transactionsRef, where("userId", "==", userId), orderBy("transactionDate", "desc"))

      if (options?.categoryId) {
        q = query(q, where("categoryId", "==", options.categoryId))
      }

      if (options?.startDate) {
        q = query(q, where("transactionDate", ">=", Timestamp.fromDate(options.startDate)))
      }

      if (options?.endDate) {
        q = query(q, where("transactionDate", "<=", Timestamp.fromDate(options.endDate)))
      }

      if (options?.limit) {
        q = query(q, limit(options.limit))
      }

      if (options?.lastDoc) {
        q = query(q, startAfter(options.lastDoc))
      }

      const querySnapshot = await getDocs(q)
      const transactions: Transaction[] = []
      let lastDoc: QueryDocumentSnapshot<DocumentData> | undefined

      querySnapshot.forEach((doc) => {
        transactions.push({ id: doc.id, ...convertTimestamps(doc.data()) } as Transaction)
        lastDoc = doc
      })

      return { transactions, lastDoc }
    } catch (error) {
      console.error("Error getting transactions:", error)
      throw error
    }
  },

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      const docRef = doc(db, "transactions", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as Transaction
      }

      return null
    } catch (error) {
      console.error("Error getting transaction:", error)
      throw error
    }
  },

  async addTransaction(transaction: Transaction): Promise<string> {
    try {
      const transactionsRef = collection(db, "transactions")
      const docRef = await addDoc(transactionsRef, {
        ...prepareForFirestore(transaction),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return docRef.id
    } catch (error) {
      console.error("Error adding transaction:", error)
      throw error
    }
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
    try {
      const docRef = doc(db, "transactions", id)
      await updateDoc(docRef, {
        ...prepareForFirestore(data),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating transaction:", error)
      throw error
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      const docRef = doc(db, "transactions", id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error("Error deleting transaction:", error)
      throw error
    }
  },

  async getTransactionSummary(
    userId: string,
    options?: {
      startDate?: Date
      endDate?: Date
      categoryId?: string
    },
  ): Promise<{ income: number; expenses: number; balance: number }> {
    try {
      const { transactions } = await this.getTransactions(userId, options)

      let income = 0
      let expenses = 0

      transactions.forEach((transaction) => {
        if (transaction.amount > 0) {
          income += transaction.amount
        } else {
          expenses += Math.abs(transaction.amount)
        }
      })

      return {
        income,
        expenses,
        balance: income - expenses,
      }
    } catch (error) {
      console.error("Error getting transaction summary:", error)
      throw error
    }
  },
}

// Category Service
export const categoryService = {
  async getCategories(userId: string): Promise<Category[]> {
    try {
      const categoriesRef = collection(db, "categories")
      const q = query(categoriesRef, where("userId", "==", userId), orderBy("name"))

      const querySnapshot = await getDocs(q)
      const categories: Category[] = []

      querySnapshot.forEach((doc) => {
        categories.push({ id: doc.id, ...doc.data() } as Category)
      })

      return categories
    } catch (error) {
      console.error("Error getting categories:", error)
      throw error
    }
  },

  async getCategory(id: string): Promise<Category | null> {
    try {
      const docRef = doc(db, "categories", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Category
      }

      return null
    } catch (error) {
      console.error("Error getting category:", error)
      throw error
    }
  },

  async addCategory(category: Category): Promise<string> {
    try {
      const categoriesRef = collection(db, "categories")
      const docRef = await addDoc(categoriesRef, category)

      return docRef.id
    } catch (error) {
      console.error("Error adding category:", error)
      throw error
    }
  },

  async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    try {
      const docRef = doc(db, "categories", id)
      await updateDoc(docRef, data)
    } catch (error) {
      console.error("Error updating category:", error)
      throw error
    }
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      const docRef = doc(db, "categories", id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error("Error deleting category:", error)
      throw error
    }
  },
}

// Budget Goal Service
export const budgetGoalService = {
  async getBudgetGoals(
    userId: string,
    options?: {
      categoryId?: string
      period?: "daily" | "weekly" | "monthly" | "yearly"
    },
  ): Promise<BudgetGoal[]> {
    try {
      const budgetGoalsRef = collection(db, "budgetGoals")
      let q = query(budgetGoalsRef, where("userId", "==", userId))

      if (options?.categoryId) {
        q = query(q, where("categoryId", "==", options.categoryId))
      }

      if (options?.period) {
        q = query(q, where("period", "==", options.period))
      }

      const querySnapshot = await getDocs(q)
      const budgetGoals: BudgetGoal[] = []

      querySnapshot.forEach((doc) => {
        budgetGoals.push({ id: doc.id, ...convertTimestamps(doc.data()) } as BudgetGoal)
      })

      return budgetGoals
    } catch (error) {
      console.error("Error getting budget goals:", error)
      throw error
    }
  },

  async getBudgetGoal(id: string): Promise<BudgetGoal | null> {
    try {
      const docRef = doc(db, "budgetGoals", id)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        return { id: docSnap.id, ...convertTimestamps(docSnap.data()) } as BudgetGoal
      }

      return null
    } catch (error) {
      console.error("Error getting budget goal:", error)
      throw error
    }
  },

  async addBudgetGoal(budgetGoal: BudgetGoal): Promise<string> {
    try {
      const budgetGoalsRef = collection(db, "budgetGoals")
      const docRef = await addDoc(budgetGoalsRef, {
        ...prepareForFirestore(budgetGoal),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      return docRef.id
    } catch (error) {
      console.error("Error adding budget goal:", error)
      throw error
    }
  },

  async updateBudgetGoal(id: string, data: Partial<BudgetGoal>): Promise<void> {
    try {
      const docRef = doc(db, "budgetGoals", id)
      await updateDoc(docRef, {
        ...prepareForFirestore(data),
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error updating budget goal:", error)
      throw error
    }
  },

  async deleteBudgetGoal(id: string): Promise<void> {
    try {
      const docRef = doc(db, "budgetGoals", id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error("Error deleting budget goal:", error)
      throw error
    }
  },

  async getBudgetProgress(
    userId: string,
    options?: {
      categoryId?: string
      period?: "daily" | "weekly" | "monthly" | "yearly"
      date?: Date
    },
  ): Promise<
    {
      budgetGoal: BudgetGoal
      spent: number
      remaining: number
      percentage: number
    }[]
  > {
    try {
      // Get budget goals
      const budgetGoals = await this.getBudgetGoals(userId, options)

      // Calculate date range based on period and date
      const date = options?.date || new Date()
      let startDate: Date
      let endDate: Date

      if (!options?.period || options.period === "monthly") {
        // Default to monthly
        startDate = new Date(date.getFullYear(), date.getMonth(), 1)
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
      } else if (options.period === "yearly") {
        startDate = new Date(date.getFullYear(), 0, 1)
        endDate = new Date(date.getFullYear(), 11, 31)
      } else if (options.period === "weekly") {
        const day = date.getDay()
        startDate = new Date(date)
        startDate.setDate(date.getDate() - day)
        endDate = new Date(startDate)
        endDate.setDate(startDate.getDate() + 6)
      } else {
        // Daily
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
      }

      // Calculate progress for each budget goal
      const progressPromises = budgetGoals.map(async (budgetGoal) => {
        // Get transactions for this category in the date range
        const { transactions } = await transactionService.getTransactions(userId, {
          categoryId: budgetGoal.categoryId,
          startDate,
          endDate,
        })

        // Calculate total spent (use absolute value for expenses)
        const spent = transactions.reduce((total, transaction) => {
          return total + Math.abs(transaction.amount < 0 ? transaction.amount : 0)
        }, 0)

        const remaining = budgetGoal.amount - spent
        const percentage = (spent / budgetGoal.amount) * 100

        return {
          budgetGoal,
          spent,
          remaining,
          percentage,
        }
      })

      return await Promise.all(progressPromises)
    } catch (error) {
      console.error("Error getting budget progress:", error)
      throw error
    }
  },
}
