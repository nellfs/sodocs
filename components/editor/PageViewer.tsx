import DOMPurify from 'isomorphic-dompurify'
import { blocksToHtml } from '@/lib/wiki/blockToHtml'

interface PageViewerProps {
  content: Record<string, unknown>[]
}

export function PageViewer({ content }: PageViewerProps) {
  if (!content || content.length === 0) {
    return (
      <div className="text-muted-foreground italic text-sm">
        Esta página está vazia.
      </div>
    )
  }

  const rawHtml = blocksToHtml(content)
  const safeHtml = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'hr',
      'a', 'img', 'figure', 'figcaption',
      'video', 'audio',
      'aside', 'table', 'tbody', 'tr', 'td', 'th',
      'input', 'span',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'loading', 'class', 'type', 'id',
      'controls', 'preload', 'download', 'aria-label',
      'checked', 'disabled', 'rel',
    ],
  })

  return (
    <div
      className="prose prose-zinc dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  )
}
