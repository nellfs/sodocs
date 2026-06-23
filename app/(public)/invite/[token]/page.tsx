import { Suspense } from 'react'
import { getInviteInfo } from '@/app/actions/auth'
import { AcceptInviteForm } from './AcceptInviteForm'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Carregando convite...
      </div>
    }>
      <InviteContent {...props} />
    </Suspense>
  )
}

async function InviteContent({ params }: InvitePageProps) {
  const { token } = await params
  const info = await getInviteInfo(token)

  if ('error' in info) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium">
            {info.error === 'expired' ? 'Convite expirado' : 'Convite inválido'}
          </p>
          <p className="text-sm text-muted-foreground">
            {info.error === 'expired'
              ? 'Este convite já expirou. Peça um novo link ao administrador.'
              : 'Este link de convite não é válido.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground">
            Você foi convidado para <strong>{info.workspaceName}</strong>
          </p>
        </div>
        <AcceptInviteForm
          token={token}
          email={info.email}
          name={info.name ?? ''}
        />
      </div>
    </div>
  )
}
