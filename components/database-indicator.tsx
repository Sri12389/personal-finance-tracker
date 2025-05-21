"use client"

import { useDatabase } from "@/contexts/database-context"
import { Database, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function DatabaseIndicator() {
  const { databaseType } = useDatabase()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Database className="h-3 w-3" />
            <span className="capitalize">{databaseType}</span>
            <HelpCircle className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Currently using {databaseType} as the database.</p>
          <p className="text-xs mt-1">You can change this in Settings.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
