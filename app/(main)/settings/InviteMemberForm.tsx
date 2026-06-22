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
  const [role, setRole] = useState('editor')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const token = await inviteMember(workspaceId, email.trim(), role)
      const inviteLink = `${window.location.origin}/invite/${token}`
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Convite criado! Link copiado para a área de transferência.')
      setEmail('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar convite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
        <option value="editor">Editor</option>
        <option value="viewer">Visualizador</option>
        <option value="admin">Admin</option>
      </select>
      <Button type="submit" disabled={loading}>
        {loading ? 'Criando...' : 'Convidar'}
      </Button>
    </form>
  )
}
