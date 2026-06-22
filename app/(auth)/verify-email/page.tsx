import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Verifique seu email</h1>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de verificação para o seu email.
          Clique no link para ativar sua conta.
        </p>
      </div>

      <Button variant="outline" className="w-full" render={<Link href="/login" />} nativeButton={false}>
        Voltar ao login
      </Button>
    </div>
  )
}
