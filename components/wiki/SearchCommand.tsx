'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { FilePlus, Globe2, Home, Search, Settings } from 'lucide-react'
import { toast } from 'sonner'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { createPage } from '@/app/actions/pages'

interface SearchResult {
  id: string
  title: string
  slug: string
  icon: string | null
  excerpt: string
}

interface SearchCommandProps {
  workspaceId: string
}

export function SearchCommand({ workspaceId }: SearchCommandProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) { setResults([]); return }
      setLoading(true)
      try {
        const res = await fetch(
          `/api/pages/search?q=${encodeURIComponent(q)}&workspaceId=${workspaceId}`,
        )
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    },
    [workspaceId],
  )

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleSelect(slug: string) {
    setOpen(false)
    router.push(`/wiki/${slug}`)
  }

  async function handleCreatePage() {
    try {
      const page = await createPage(workspaceId)
      sessionStorage.setItem('wiki-rename-pending', page.id)
      setOpen(false)
      toast.success('Página criada')
      router.push(`/wiki/${page.slug}?mode=edit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar página')
    }
  }

  function handleNavigate(path: string) {
    setOpen(false)
    router.push(path)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Buscar</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-4 select-none items-center gap-0.5 rounded border border-sidebar-border bg-sidebar-accent px-1 font-mono text-[10px] font-medium text-sidebar-foreground/50">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar páginas..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && <CommandEmpty>Buscando...</CommandEmpty>}
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Nenhum resultado para &ldquo;{query}&rdquo;</CommandEmpty>
          )}
          {!loading && query.length < 2 && (
            <CommandGroup heading="Ações rápidas">
              <CommandItem value="home" onSelect={() => handleNavigate('/wiki')}>
                <Home className="mr-2 h-4 w-4" />
                Abrir painel da wiki
              </CommandItem>
              <CommandItem value="new-page" onSelect={handleCreatePage}>
                <FilePlus className="mr-2 h-4 w-4" />
                Nova página
              </CommandItem>
              <CommandItem value="settings" onSelect={() => handleNavigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </CommandItem>
              <CommandItem value="public-docs" onSelect={() => handleNavigate('/p')}>
                <Globe2 className="mr-2 h-4 w-4" />
                Portal público
              </CommandItem>
            </CommandGroup>
          )}
          {results.length > 0 && (
            <CommandGroup heading="Páginas">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.slug}
                  onSelect={() => handleSelect(result.slug)}
                >
                  <span className="mr-2 text-base">{result.icon ?? '📄'}</span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.excerpt && (
                      <p
                        className="text-xs text-muted-foreground line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
