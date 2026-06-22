'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PublicSearchResult {
  id: string
  title: string
  slug: string
  icon: string | null
  excerpt: string
}

export function PublicSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PublicSearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (value: string) => {
    if (value.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/public/search?q=${encodeURIComponent(value)}`)
      const data = await response.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => search(query), 200)
    return () => window.clearTimeout(timer)
  }, [query, search])

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar na documentação pública..."
          className="h-11 pl-9"
        />
      </div>

      {(query.length >= 2 || loading) && (
        <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border bg-popover shadow-lg">
          {loading ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Buscando...</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nenhum resultado público encontrado.</p>
          ) : (
            <div className="divide-y">
              {results.map((result) => (
                <Link
                  key={result.id}
                  href={`/p/${result.slug}`}
                  className="block px-4 py-3 transition-colors hover:bg-accent"
                >
                  <p className="truncate text-sm font-medium">
                    {result.icon ?? '📄'} {result.title}
                  </p>
                  {result.excerpt && (
                    <p
                      className="mt-1 line-clamp-1 text-xs text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
