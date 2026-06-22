import Link from 'next/link'
import { SomaxLogo } from '@/components/brand/SomaxLogo'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/p" className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80">
          <SomaxLogo className="h-8 w-8" iconClassName="h-5 w-5" />
          <span>Somax Docs</span>
        </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/p"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Documentação
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
