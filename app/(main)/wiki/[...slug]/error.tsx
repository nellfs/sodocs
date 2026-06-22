'use client'
import { Button } from '@/components/ui/button'

export default function WikiPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        {error.message ?? 'Ocorreu um erro ao carregar esta página.'}
      </p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  )
}
