'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createWorkspace } from '@/app/actions/pages'

export default function OnboardingForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  function handleNameChange(value: string) {
    setName(value)
    setSlug(
      value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createWorkspace(name.trim(), slug.trim())
      toast.success('Workspace criado!')
      router.push('/wiki')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar workspace')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <div className="text-4xl mb-4">👋</div>
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo à wiki!</h1>
        <p className="text-sm text-muted-foreground">
          Crie seu primeiro workspace para começar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nome do workspace</label>
          <Input
            placeholder="Ex: Somax, Produto, Engenharia..."
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Slug (URL)</label>
          <Input
            placeholder="somax"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Usado na URL do workspace. Apenas letras, números e hífens.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loading || !name || !slug}>
          {loading ? 'Criando...' : 'Criar workspace'}
        </Button>
      </form>
    </div>
  )
}
