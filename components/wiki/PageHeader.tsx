'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Copy, Eye, EyeOff, Globe, MoreHorizontal, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  deletePage,
  duplicatePage,
  toggleFavoritePage,
  togglePageVisibility,
  updatePageIcon,
  updatePageTitle,
} from '@/app/actions/pages'
import { EmojiPicker } from './EmojiPicker'

interface PageHeaderProps {
  pageId: string
  title: string
  icon: string | null
  isPublic: boolean
  isExplicitlyPrivate?: boolean
  isEditable: boolean
  slug: string
  isFavorite?: boolean
}

export function PageHeader({
  pageId,
  title,
  icon,
  isPublic,
  isExplicitlyPrivate = false,
  isEditable,
  slug,
  isFavorite = false,
}: PageHeaderProps) {
  const router = useRouter()
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(title)
  const [iconValue, setIconValue] = useState(icon)
  const [favorite, setFavorite] = useState(isFavorite)

  async function handleTitleSubmit() {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== title) {
      try {
        const { newSlug } = await updatePageTitle(pageId, trimmed)
        toast.success('Título atualizado')
        router.push(`/wiki/${newSlug}`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erro ao atualizar título')
        setTitleValue(title)
      }
    }
    setEditingTitle(false)
  }

  async function handleIconChange(emoji: string) {
    setIconValue(emoji)
    try {
      await updatePageIcon(pageId, emoji)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar ícone')
      setIconValue(icon)
    }
  }

  async function handleDelete() {
    if (!confirm('Arquivar esta página? Ela sairá da árvore, mas poderá ser restaurada depois.')) return
    await deletePage(pageId)
  }

  async function handleDuplicate() {
    const copy = await duplicatePage(pageId)
    toast.success('Página duplicada')
    router.push(`/wiki/${copy.slug}`)
  }

  async function handleToggleVisibility() {
    await togglePageVisibility(pageId, !isPublic)
    toast.success(isPublic ? 'Página privada' : 'Página publicada')
    router.refresh()
  }

  async function handleFavorite() {
    try {
      const next = await toggleFavoritePage(pageId)
      setFavorite(next)
      toast.success(next ? 'Adicionada aos favoritos' : 'Removida dos favoritos')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao favoritar página')
    }
  }

  async function copyPublicLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`)
    toast.success('Link público copiado')
  }

  return (
    <div className="flex items-start gap-3 pb-4">
      {isEditable ? (
        <EmojiPicker value={iconValue} onChange={handleIconChange}>
          <button
            className="rounded-lg p-1 text-4xl leading-none transition-colors hover:bg-accent"
            title="Alterar ícone"
          >
            {iconValue ?? '📄'}
          </button>
        </EmojiPicker>
      ) : (
        <span className="px-1 text-4xl leading-none">{iconValue ?? '📄'}</span>
      )}

      <div className="min-w-0 flex-1">
        {isEditable && editingTitle ? (
          <input
            className="w-full border-none bg-transparent text-3xl font-bold outline-none focus:ring-0"
            value={titleValue}
            onChange={(event) => setTitleValue(event.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleTitleSubmit()
              if (event.key === 'Escape') setEditingTitle(false)
            }}
            autoFocus
          />
        ) : (
          <h1
            className={`text-3xl font-bold tracking-tight ${isEditable ? 'cursor-text rounded px-1 -ml-1 hover:bg-accent/50' : ''}`}
            onClick={() => isEditable && setEditingTitle(true)}
          >
            {titleValue}
          </h1>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isPublic ? (
            <Badge variant="outline" className="gap-1 border-sky-200 bg-sky-50 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300">
              <Globe className="h-3 w-3" /> Público
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {isExplicitlyPrivate ? 'Privado escolhido' : 'Privado'}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleFavorite}
          aria-label={favorite ? 'Remover favorito' : 'Adicionar favorito'}
          className={favorite ? 'text-amber-500 hover:text-amber-600' : ''}
        >
          <Star className={favorite ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
        </Button>

        {isEditable && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={handleToggleVisibility}>
                {isPublic ? (
                  <><EyeOff className="h-4 w-4 mr-2" /> Tornar privado nesta árvore</>
                ) : (
                  <><Eye className="h-4 w-4 mr-2" /> Publicar esta árvore</>
                )}
              </DropdownMenuItem>
              {isPublic && (
                <DropdownMenuItem onClick={copyPublicLink}>
                  <Globe className="h-4 w-4 mr-2" /> Copiar link público
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Arquivar página
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
