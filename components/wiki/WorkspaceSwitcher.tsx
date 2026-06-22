'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronsUpDown, Check, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createWorkspace, setCurrentWorkspace } from '@/app/actions/pages'
import { SomaxLogo } from '@/components/brand/SomaxLogo'

interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace
}

export function WorkspaceSwitcher({ workspaces, currentWorkspace }: WorkspaceSwitcherProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
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
        .slice(0, 50),
    )
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await createWorkspace(name, slug)
    setDialogOpen(false)
    setName('')
    setSlug('')
    setLoading(false)
    router.refresh()
  }

  async function handleSwitch(workspaceId: string) {
    try {
      await setCurrentWorkspace(workspaceId)
      router.push('/wiki')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao trocar workspace')
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-sidebar-accent transition-colors focus-visible:outline-none group">
          <WorkspaceAvatar name={currentWorkspace.name} logoUrl={currentWorkspace.logoUrl} />
          <span className="flex-1 truncate text-left text-sidebar-foreground">
            {currentWorkspace.name}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70 transition-colors" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56" sideOffset={4}>
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
            Workspaces
          </div>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => handleSwitch(ws.id)}
              className="gap-2"
            >
              <WorkspaceAvatar name={ws.name} logoUrl={ws.logoUrl} size="sm" />
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === currentWorkspace.id && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-muted-foreground/40">
              <Plus className="h-3 w-3 text-muted-foreground/60" />
            </div>
            Criar workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Minha equipe"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                placeholder="minha-equipe"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando...' : 'Criar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function WorkspaceAvatar({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string
  logoUrl: string | null
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs'

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name} className={`${dim} rounded object-cover shrink-0`} />
    )
  }

  return (
    <SomaxLogo
      className={`${dim} rounded`}
      iconClassName={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'}
    />
  )
}
