export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          icon: string | null
          color: string | null
          type: "income" | "expense"
          user_id: string | null
          is_default: boolean
        }
        Insert: {
          id?: number
          name: string
          icon?: string | null
          color?: string | null
          type: "income" | "expense"
          user_id?: string | null
          is_default?: boolean
        }
        Update: {
          id?: number
          name?: string
          icon?: string | null
          color?: string | null
          type?: "income" | "expense"
          user_id?: string | null
          is_default?: boolean
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          title: string
          amount: number
          category_id: number | null
          transaction_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          amount: number
          category_id?: number | null
          transaction_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          amount?: number
          category_id?: number | null
          transaction_date?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_goals: {
        Row: {
          id: number
          user_id: string
          category_id: number | null
          amount: number
          period: "daily" | "weekly" | "monthly" | "yearly"
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          category_id?: number | null
          amount: number
          period: "daily" | "weekly" | "monthly" | "yearly"
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          category_id?: number | null
          amount?: number
          period?: "daily" | "weekly" | "monthly" | "yearly"
          start_date?: string
          end_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Category = Database["public"]["Tables"]["categories"]["Row"]
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"]
export type BudgetGoal = Database["public"]["Tables"]["budget_goals"]["Row"]

export type TransactionWithCategory = Transaction & {
  category: Category | null
}
