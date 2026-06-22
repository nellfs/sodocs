'use client'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface Page { id: string; title: string; icon: string | null; slug: string }

interface PageLinkPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (page: Page) => void
  publicOnly?: boolean
}

export function PageLinkPicker({
  open,
  onOpenChange,
  onSelect,
  publicOnly = false,
}: PageLinkPickerProps) {
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState<Page[]>([])

  useEffect(() => {
    if (!open) return
    const params = new URLSearchParams({ q: query })
    if (publicOnly) params.set('publicOnly', '1')
    fetch(`/api/pages/search?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setPages(d.results ?? []))
      .catch(() => setPages([]))
  }, [query, open, publicOnly])

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('')
      setPages([])
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Inserir referência de página</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            placeholder="Buscar página..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto rounded border divide-y">
            {pages.map((page) => (
              <button
                key={page.id}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onSelect(page)
                  onOpenChange(false)
                }}
              >
                <span className="text-base">{page.icon ?? '📄'}</span>
                <span className="truncate">{page.title}</span>
              </button>
            ))}

            {pages.length === 0 && (
              <p className="px-3 py-4 text-sm text-center text-muted-foreground">
                {query.length > 0
                  ? 'Nenhuma página encontrada'
                  : publicOnly
                    ? 'Somente páginas públicas podem ser referenciadas aqui'
                    : 'Nenhuma página ainda'}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
