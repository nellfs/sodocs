'use client'
import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import '@blocknote/core/fonts/inter.css'
import {
  BlockNoteViewRaw,
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react'
import { filterSuggestionItems } from '@blocknote/core'
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions'
import '@blocknote/react/style.css'
import { FileIcon, ImageIcon, LinkIcon, MusicIcon, VideoIcon } from 'lucide-react'
import { updatePageContent } from '@/app/actions/pages'
import { extractTextFromBlocks } from '@/lib/wiki/utils'
import { SlashMenu } from './SlashMenu'
import { PageLinkPicker } from './PageLinkPicker'

interface PageEditorProps {
  pageId: string
  initialContent: Record<string, unknown>[]
  isEditable: boolean
  pageIsPublic?: boolean
}

const AUTOSAVE_DELAY = 500
const MEDIA_ITEM_KEYS = new Set(['image', 'video', 'audio', 'file'])

type UploadBlockType = 'image' | 'video' | 'audio' | 'file'

export function PageEditor({
  pageId,
  initialContent,
  isEditable,
  pageIsPublic = false,
}: PageEditorProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved')
  const [pageLinkOpen, setPageLinkOpen] = useState(false)
  // Store the ProseMirror anchor position before the dialog steals focus
  const insertPosRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadBlockTypeRef = useRef<UploadBlockType>('file')

  const uploadEditorFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`/api/uploads?pageId=${pageId}`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.error ?? 'Erro ao enviar arquivo')
    }

    return response.json() as Promise<{ url: string; name: string }>
  }, [pageId])

  const editor = useCreateBlockNote({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialContent: initialContent.length > 0 ? (initialContent as any) : undefined,
    uploadFile: async (file) => {
      const data = await uploadEditorFile(file)
      return {
        props: {
          url: data.url,
          name: data.name,
        },
      }
    },
  })

  const openUploadPicker = useCallback((blockType: UploadBlockType, accept: string) => {
    uploadBlockTypeRef.current = blockType

    if (fileInputRef.current) {
      fileInputRef.current.accept = accept
      fileInputRef.current.click()
    }
  }, [])

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    try {
      setSaveState('saving')
      const data = await uploadEditorFile(file)
      const blockType = uploadBlockTypeRef.current

      editor.focus()
      insertOrUpdateBlockForSlashMenu(editor, {
        type: blockType,
        props: {
          url: data.url,
          name: data.name,
        },
      })
    } catch {
      setSaveState('error')
    }
  }, [editor, uploadEditorFile])

  const openPageLink = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiptap = (editor as any)._tiptapEditor
    insertPosRef.current = tiptap.state.selection.anchor as number
    setPageLinkOpen(true)
  }, [editor])

  const handleChange = useCallback(() => {
    if (!isEditable) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveState('saving')

    timerRef.current = setTimeout(async () => {
      try {
        const blocks = editor.document as unknown as Record<string, unknown>[]
        const contentText = extractTextFromBlocks(blocks)
        await updatePageContent(pageId, blocks, contentText)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, AUTOSAVE_DELAY)
  }, [editor, pageId, isEditable])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function handlePageLinkSelect(page: { title: string; slug: string; icon: string | null }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tiptap = (editor as any)._tiptapEditor
    const pos = insertPosRef.current ?? tiptap.state.selection.anchor

    // Insert inline text with a link mark at the saved cursor position
    tiptap
      .chain()
      .focus()
      .setTextSelection(pos)
      .insertContent([
        {
          type: 'text',
          text: `${page.icon ?? '📄'} ${page.title}`,
          marks: [{ type: 'link', attrs: { href: `/wiki/${page.slug}`, target: null } }],
        },
      ])
      .run()

    insertPosRef.current = null
  }

  return (
    <div className="relative">
      {isEditable && (
        <div className="absolute top-2 right-4 z-10 text-xs text-muted-foreground select-none">
          {saveState === 'saving' && 'Salvando...'}
          {saveState === 'error' && <span className="text-destructive">Erro ao salvar</span>}
        </div>
      )}

      <BlockNoteViewRaw
        editor={editor}
        editable={isEditable}
        onChange={handleChange}
        theme="light"
        className="min-h-[400px]"
        sideMenu={false}
        formattingToolbar={false}
        slashMenu={false}
        filePanel={true}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => {
            const pageItem = {
              title: 'Página',
              subtext: 'Referenciar outra página',
              group: 'Avançado',
              icon: <LinkIcon className="h-4 w-4" />,
              onItemClick: openPageLink,
            }
            const uploadItems = [
              {
                title: 'Imagem',
                subtext: 'Enviar PNG, JPG, WebP, GIF ou AVIF',
                group: 'Mídia',
                icon: <ImageIcon className="h-4 w-4" />,
                onItemClick: () => openUploadPicker(
                  'image',
                  'image/png,image/jpeg,image/webp,image/gif,image/avif',
                ),
              },
              {
                title: 'Vídeo',
                subtext: 'Enviar MP4, WebM ou MOV',
                group: 'Mídia',
                icon: <VideoIcon className="h-4 w-4" />,
                onItemClick: () => openUploadPicker('video', 'video/mp4,video/webm,video/quicktime'),
              },
              {
                title: 'Áudio',
                subtext: 'Enviar MP3, WAV, M4A ou OGG',
                group: 'Mídia',
                icon: <MusicIcon className="h-4 w-4" />,
                onItemClick: () => openUploadPicker('audio', 'audio/mpeg,audio/wav,audio/mp4,audio/ogg'),
              },
              {
                title: 'Arquivo',
                subtext: 'Enviar PDF, docs, planilhas e outros anexos',
                group: 'Mídia',
                icon: <FileIcon className="h-4 w-4" />,
                onItemClick: () => openUploadPicker('file', [
                  'application/pdf',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/vnd.ms-powerpoint',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/zip',
                  'text/plain',
                  'text/csv',
                  'application/json',
                ].join(',')),
              },
            ]
            const defaultItems = getDefaultReactSlashMenuItems(editor).filter(
              (item) => !MEDIA_ITEM_KEYS.has((item as { key?: string }).key ?? ''),
            )

            return filterSuggestionItems(
              [pageItem, ...uploadItems, ...defaultItems],
              query,
            )
          }}
          suggestionMenuComponent={SlashMenu}
        />
      </BlockNoteViewRaw>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <PageLinkPicker
        open={pageLinkOpen}
        onOpenChange={setPageLinkOpen}
        onSelect={handlePageLinkSelect}
        publicOnly={pageIsPublic}
      />
    </div>
  )
}
