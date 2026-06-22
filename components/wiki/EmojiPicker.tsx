'use client'
import { useState, type ReactElement } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

const EMOJIS = [
  '📄','📁','📂','📋','📊','📈','📉','📌','📍','🔖','🗂️','📑',
  '💡','⚡','🔥','✨','🎯','🚀','🛠️','🔧','🔨','⚙️','🔑','🔐',
  '📝','✏️','🖊️','🖋️','📓','📔','📒','📕','📗','📘','📙','📚',
  '👥','👤','🤝','💼','🏢','🌐','📧','📞','💬','🗣️','👋','🤔',
  '✅','❌','⚠️','ℹ️','❓','🔴','🟡','🟢','🔵','⭐','💎','🏆',
  '🏠','🗺️','🎨','🎵','📸','🎬','🎮','💰','🌟','💫','🎉','🎁',
]

interface EmojiPickerProps {
  value: string | null
  onChange: (emoji: string) => void
  children: ReactElement
}

export function EmojiPicker({ value, onChange, children }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  function pick(emoji: string) {
    onChange(emoji)
    setOpen(false)
    setCustom('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent className="w-72 p-3" align="start" side="bottom">
        <div className="grid grid-cols-12 gap-0.5 mb-3">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => pick(e)}
              className={`text-xl rounded p-0.5 hover:bg-accent transition-colors leading-none ${value === e ? 'bg-accent' : ''}`}
            >
              {e}
            </button>
          ))}
        </div>
        <form
          onSubmit={(ev) => { ev.preventDefault(); const t = custom.trim(); if (t) pick(t) }}
          className="flex gap-2"
        >
          <Input
            placeholder="Cole um emoji personalizado…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-8 text-sm"
          />
          <button
            type="submit"
            className="shrink-0 h-8 px-2 rounded border text-xs hover:bg-accent transition-colors"
          >
            OK
          </button>
        </form>
      </PopoverContent>
    </Popover>
  )
}
