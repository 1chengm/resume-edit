'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SharePageActions() {
  return (
    <div className="flex justify-end gap-2 print:hidden">
      <Button onClick={() => window.print()} variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        Print / PDF
      </Button>
    </div>
  )
}
