// Server-side BlockNote JSON → HTML renderer (no DOM required)
// Handles the standard block types shipped by @blocknote/core

type InlineContent =
  | { type: 'text'; text: string; styles?: Record<string, unknown> }
  | { type: 'link'; href: string; content: InlineContent[] }

type Block = {
  type: string
  id?: string
  props?: Record<string, unknown>
  content?: InlineContent[] | { type: string; rows?: unknown[] }
  children?: Block[]
}

function fileNameFromUrl(url: string) {
  const last = url.split('/').pop() ?? 'arquivo'
  try {
    return decodeURIComponent(last)
  } catch {
    return last
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(content: InlineContent[]): string {
  return content
    .map((node) => {
      if (node.type === 'link') {
        const inner = renderInline(node.content)
        return `<a href="${escapeHtml(node.href)}" rel="noopener noreferrer">${inner}</a>`
      }

      // text node
      const { text, styles = {} } = node as { type: 'text'; text: string; styles?: Record<string, unknown> }
      let html = escapeHtml(text).replace(/\n/g, '<br>')

      if (styles.bold) html = `<strong>${html}</strong>`
      if (styles.italic) html = `<em>${html}</em>`
      if (styles.underline) html = `<u>${html}</u>`
      if (styles.strike) html = `<s>${html}</s>`
      if (styles.code) html = `<code>${html}</code>`

      return html
    })
    .join('')
}

function renderBlock(block: Block, level = 0): string {
  const content = Array.isArray(block.content) ? block.content as InlineContent[] : []
  const inner = renderInline(content)
  const children =
    block.children?.map((c) => renderBlock(c, level + 1)).join('') ?? ''

  switch (block.type) {
    case 'paragraph':
      return `<p>${inner}</p>${children}`

    case 'heading': {
      const h = Math.min(Math.max(Number(block.props?.level ?? 1), 1), 6)
      const id = escapeHtml(String(block.id ?? ''))
      return `<h${h}${id ? ` id="${id}"` : ''}>${inner}</h${h}>${children}`
    }

    case 'bulletListItem':
      return `<li>${inner}${children ? `<ul>${children}</ul>` : ''}</li>`

    case 'numberedListItem':
      return `<li>${inner}${children ? `<ol>${children}</ol>` : ''}</li>`

    case 'checkListItem': {
      const checked = block.props?.checked ? 'checked' : ''
      return `<li class="task-item"><input type="checkbox" ${checked} disabled> ${inner}${children}</li>`
    }

    case 'codeBlock': {
      const lang = escapeHtml(String(block.props?.language ?? ''))
      return `<pre><code class="language-${lang}">${inner}</code></pre>${children}`
    }

    case 'quote':
      return `<blockquote>${inner}${children}</blockquote>`

    case 'alert':
    case 'callout': {
      const variant = escapeHtml(String(block.props?.type ?? block.props?.variant ?? 'info'))
      return `<aside class="wiki-callout wiki-callout-${variant}">${inner}${children}</aside>`
    }

    case 'image': {
      const src = escapeHtml(String(block.props?.url ?? ''))
      const alt = escapeHtml(String(block.props?.name ?? 'image'))
      const caption = block.props?.caption ? `<figcaption>${escapeHtml(String(block.props.caption))}</figcaption>` : ''
      return src ? `<figure><img src="${src}" alt="${alt}" loading="lazy">${caption}</figure>${children}` : ''
    }

    case 'video': {
      const src = escapeHtml(String(block.props?.url ?? ''))
      const name = escapeHtml(String(block.props?.name ?? fileNameFromUrl(src)))
      const caption = block.props?.caption ? `<figcaption>${escapeHtml(String(block.props.caption))}</figcaption>` : ''
      return src
        ? `<figure><video src="${src}" controls preload="metadata" aria-label="${name}"></video>${caption}</figure>${children}`
        : ''
    }

    case 'audio': {
      const src = escapeHtml(String(block.props?.url ?? ''))
      const name = escapeHtml(String(block.props?.name ?? fileNameFromUrl(src)))
      const caption = block.props?.caption ? `<figcaption>${escapeHtml(String(block.props.caption))}</figcaption>` : ''
      return src
        ? `<figure><audio src="${src}" controls preload="metadata" aria-label="${name}"></audio>${caption}</figure>${children}`
        : ''
    }

    case 'file': {
      const src = escapeHtml(String(block.props?.url ?? ''))
      const name = escapeHtml(String(block.props?.name ?? fileNameFromUrl(src)))
      const caption = block.props?.caption ? `<span class="wiki-file-caption">${escapeHtml(String(block.props.caption))}</span>` : ''
      return src
        ? `<p class="wiki-file"><a href="${src}" download rel="noopener noreferrer">${name}</a>${caption}</p>${children}`
        : ''
    }

    case 'divider':
      return `<hr>${children}`

    case 'table':
      return `${renderTable(block.content)}${children}`

    default:
      return inner ? `<p>${inner}</p>${children}` : children
  }
}

function renderTable(content: Block['content']): string {
  if (!content || Array.isArray(content) || !Array.isArray(content.rows)) {
    return '<p>[Tabela]</p>'
  }

  const rows = content.rows as unknown[]
  const htmlRows = rows
    .map((row) => {
      const cells = Array.isArray(row)
        ? row
        : typeof row === 'object' && row !== null && Array.isArray((row as { cells?: unknown[] }).cells)
          ? (row as { cells: unknown[] }).cells
          : []

      const htmlCells = cells
        .map((cell) => {
          if (Array.isArray(cell)) return `<td>${renderInline(cell as InlineContent[])}</td>`
          if (typeof cell === 'object' && cell !== null && Array.isArray((cell as { content?: unknown[] }).content)) {
            return `<td>${renderInline((cell as { content: InlineContent[] }).content)}</td>`
          }
          return `<td>${escapeHtml(String(cell ?? ''))}</td>`
        })
        .join('')

      return `<tr>${htmlCells}</tr>`
    })
    .join('')

  return `<div class="wiki-table-wrap"><table>${htmlRows}</table></div>`
}

function wrapLists(html: string): string {
  // Wrap consecutive <li> items in <ul>
  // Uses split/join instead of dotAll flag for TS 2017 compat
  const parts = html.split(/(?<=<\/li>)(?=<li)/)
  // If there are no list items, return as-is
  if (!html.includes('<li')) return html

  // Wrap contiguous runs of <li> in a <ul>
  const result = html.replace(
    /(<li(?:\s[^>]*)?>[\s\S]*?<\/li>)+/g,
    (match) => {
      if (match.includes('type="checkbox"'))
        return `<ul class="task-list">${match}</ul>`
      return `<ul>${match}</ul>`
    },
  )
  void parts // silence unused warning
  return result
}

export function blocksToHtml(blocks: Record<string, unknown>[]): string {
  const raw = (blocks as Block[]).map((b) => renderBlock(b)).join('')
  return wrapLists(raw)
}
