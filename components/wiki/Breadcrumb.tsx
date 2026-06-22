import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  id: string
  title: string
  slug: string
}

interface BreadcrumbProps {
  ancestors: BreadcrumbItem[]
  currentTitle: string
}

export function Breadcrumb({ ancestors, currentTitle }: BreadcrumbProps) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
      <Link href="/wiki" className="hover:text-foreground transition-colors shrink-0">
        Wiki
      </Link>

      {ancestors.map((ancestor) => (
        <span key={ancestor.id} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <Link
            href={`/wiki/${ancestor.slug}`}
            className="hover:text-foreground transition-colors truncate"
          >
            {ancestor.title}
          </Link>
        </span>
      ))}

      <span className="flex items-center gap-1 min-w-0">
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-foreground font-medium truncate">{currentTitle}</span>
      </span>
    </nav>
  )
}
