import type React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
  cols?: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
  gap?: number
}

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, md: 2, lg: 3 },
  gap = 4,
}: ResponsiveGridProps) {
  // Generate grid template columns classes based on breakpoints
  const gridColsClasses = [
    `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols["2xl"] && `2xl:grid-cols-${cols["2xl"]}`,
  ].filter(Boolean)

  // Generate gap class
  const gapClass = `gap-${gap}`

  return <div className={cn("grid", gapClass, ...gridColsClasses, className)}>{children}</div>
}
