import { Suspense } from 'react'
import { acceptInvitation } from '@/app/actions/pages'

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">Processando convite...</div>}>
      <InviteContent {...props} />
    </Suspense>
  )
}

async function InviteContent({ params }: InvitePageProps) {
  const { token } = await params
  await acceptInvitation(token)
  return null
}
