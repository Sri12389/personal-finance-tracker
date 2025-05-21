import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  ShoppingCart,
  Home,
  Car,
  Briefcase,
  Coffee,
  Gift,
  CreditCard,
  Utensils,
  Plane,
  Book,
  Heart,
  DollarSign,
} from "lucide-react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

export function getCategoryIcon(iconName: string | null) {
  switch (iconName) {
    case "shopping":
      return <ShoppingCart className="h-4 w-4" />
    case "home":
      return <Home className="h-4 w-4" />
    case "car":
      return <Car className="h-4 w-4" />
    case "work":
      return <Briefcase className="h-4 w-4" />
    case "coffee":
      return <Coffee className="h-4 w-4" />
    case "gift":
      return <Gift className="h-4 w-4" />
    case "credit-card":
      return <CreditCard className="h-4 w-4" />
    case "food":
      return <Utensils className="h-4 w-4" />
    case "travel":
      return <Plane className="h-4 w-4" />
    case "education":
      return <Book className="h-4 w-4" />
    case "health":
      return <Heart className="h-4 w-4" />
    case "income":
      return <DollarSign className="h-4 w-4" />
    default:
      return <CreditCard className="h-4 w-4" />
  }
}
