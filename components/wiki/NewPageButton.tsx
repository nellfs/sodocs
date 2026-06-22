'use client'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ListChecks, Plus, ScrollText, Sparkles, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createPage } from '@/app/actions/pages'

interface NewPageButtonProps {
  workspaceId: string
  variant?: 'full' | 'icon'
}

export function NewPageButton({ workspaceId, variant = 'full' }: NewPageButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleCreate(template: Parameters<typeof createPage>[3] = 'blank') {
    setLoading(true)
    try {
      const page = await createPage(workspaceId, null, 'Untitled', template)
      sessionStorage.setItem('wiki-rename-pending', page.id)
      toast.success('Página criada')
      router.push(`/wiki/${page.slug}?mode=edit`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar página')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <TemplateMenu onCreate={handleCreate}>
        <button
          disabled={loading}
          title="Nova página"
          className="flex h-5 w-5 items-center justify-center rounded text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </TemplateMenu>
    )
  }

  return (
    <TemplateMenu onCreate={handleCreate}>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        disabled={loading}
      >
        <Plus className="h-4 w-4" />
        Nova página
      </Button>
    </TemplateMenu>
  )
}

function TemplateMenu({
  children,
  onCreate,
}: {
  children: ReactElement
  onCreate: (template: Parameters<typeof createPage>[3]) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => onCreate('blank')}>
          <FileText className="h-4 w-4 mr-2" /> Página em branco
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onCreate('technical-doc')}>
          <Wrench className="h-4 w-4 mr-2" /> Documentação técnica
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCreate('meeting')}>
          <ListChecks className="h-4 w-4 mr-2" /> Reunião
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCreate('process')}>
          <ScrollText className="h-4 w-4 mr-2" /> Processo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCreate('faq')}>
          <Sparkles className="h-4 w-4 mr-2" /> FAQ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCreate('release-note')}>
          <FileText className="h-4 w-4 mr-2" /> Release note
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
