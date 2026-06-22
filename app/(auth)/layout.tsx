import Link from 'next/link'
import { SomaxLogo } from '@/components/brand/SomaxLogo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2 text-sm font-semibold">
          <SomaxLogo className="h-9 w-9" iconClassName="h-6 w-6" />
          <span>Somax Wiki</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
