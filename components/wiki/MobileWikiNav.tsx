'use client'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { SomaxLogo } from '@/components/brand/SomaxLogo'

export function MobileWikiNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background/90 px-3 backdrop-blur">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Abrir navegação" />
            }
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[85vw] p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navegação da wiki</SheetTitle>
            {children}
          </SheetContent>
        </Sheet>
        <span className="flex items-center gap-2 text-sm font-semibold">
          <SomaxLogo className="h-7 w-7" iconClassName="h-[18px] w-[18px]" />
          Somax Wiki
        </span>
        <span className="h-8 w-8" />
      </div>
    </div>
  )
}
