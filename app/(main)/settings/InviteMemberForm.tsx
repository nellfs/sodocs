'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { inviteMember } from '@/app/actions/pages'

interface InviteMemberFormProps {
  workspaceId: string
}

export function InviteMemberForm({ workspaceId }: InviteMemberFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setInviteLink(null)
    try {
      const token = await inviteMember(workspaceId, email.trim(), role, name.trim() || undefined)
      const link = `${window.location.origin}/invite/${token}`
      setInviteLink(link)
      await navigator.clipboard.writeText(link)
      toast.success('Link copiado! Válido por 14 minutos.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar convite')
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    toast.success('Link copiado!')
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="email@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="viewer">Visualizador</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nome (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? 'Criando...' : 'Gerar convite'}
          </Button>
        </div>
      </form>

      {inviteLink && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
          <code className="flex-1 truncate text-xs">{inviteLink}</code>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            Copiar
          </Button>
        </div>
      )}
    </div>
  )
}
