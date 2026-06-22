'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const PageEditor = dynamic(
  () => import('./PageEditor').then((m) => ({ default: m.PageEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    ),
  },
)

export { PageEditor }
