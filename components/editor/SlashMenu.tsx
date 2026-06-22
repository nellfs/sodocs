'use client'
import type { FC } from 'react'
import type { SuggestionMenuProps, DefaultReactSuggestionItem } from '@blocknote/react'
import { cn } from '@/lib/utils'

export const SlashMenu: FC<SuggestionMenuProps<DefaultReactSuggestionItem>> = ({
  items,
  loadingState,
  selectedIndex,
  onItemClick,
}) => {
  if (loadingState === 'loading-initial' || items.length === 0) return null

  // Group items by their group label
  const groups: Record<string, { item: DefaultReactSuggestionItem; index: number }[]> = {}
  items.forEach((item, index) => {
    const g = item.group ?? 'Outros'
    if (!groups[g]) groups[g] = []
    groups[g].push({ item, index })
  })

  return (
    <div className="z-50 min-w-[220px] max-h-80 overflow-y-auto rounded-lg border bg-popover shadow-lg py-1">
      {loadingState === 'loading' && (
        <div className="px-3 py-2 text-xs text-muted-foreground">Carregando...</div>
      )}

      {Object.entries(groups).map(([group, entries]) => (
        <div key={group}>
          <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </div>
          {entries.map(({ item, index }) => (
            <button
              key={item.title}
              type="button"
              className={cn(
                'w-full flex items-center gap-2.5 px-2 py-1.5 text-left text-sm transition-colors',
                selectedIndex === index
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/60 text-popover-foreground',
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                onItemClick?.(item)
              }}
            >
              {item.icon && (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border bg-background text-base">
                  {item.icon}
                </span>
              )}
              <div className="min-w-0">
                <div className="font-medium leading-tight">{item.title}</div>
                {item.subtext && (
                  <div className="text-[11px] text-muted-foreground truncate">{item.subtext}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
