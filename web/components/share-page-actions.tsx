'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SharePageActions() {
  return (
    <div className="flex justify-end gap-2 print:hidden">
      <div className="flex items-center rounded-xl border bg-background/90 p-1 shadow-sm">
        <Button onClick={() => window.print()} variant="ghost" className="gap-2 h-8 px-3">
        <Download className="h-4 w-4" />
        Print / PDF
        </Button>
      </div>
    </div>
  )
}
