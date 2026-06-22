import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function WikiPageNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">🔍</div>
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        Esta página não existe ou foi excluída.
      </p>
      <Button variant="outline" render={<Link href="/wiki" />} nativeButton={false}>
        Voltar para a wiki
      </Button>
    </div>
  )
}
