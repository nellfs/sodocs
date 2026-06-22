import Link from 'next/link'

export default function PublicPageNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-5xl">🔍</div>
      <h2 className="text-xl font-semibold">Página não encontrada</h2>
      <p className="text-muted-foreground max-w-sm text-sm">
        Esta página não existe ou não está disponível publicamente.
      </p>
      <Link href="/" className="text-sm text-primary hover:underline">
        Voltar ao início
      </Link>
    </div>
  )
}
