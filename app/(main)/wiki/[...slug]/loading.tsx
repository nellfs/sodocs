import { Skeleton } from '@/components/ui/skeleton'

export default function WikiPageLoading() {
  return (
    <div className="mx-auto max-w-3xl w-full px-6 py-8">
      <Skeleton className="h-4 w-48 mb-6" />
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-10 w-10 rounded" />
        <Skeleton className="h-9 w-64" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
