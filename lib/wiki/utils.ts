import type { PageTreeNode } from './types'

type FlatPage = {
  id: string
  title: string
  slug: string
  icon: string | null
  isPublic: boolean
  isExplicitlyPrivate?: boolean
  parentId: string | null
  position: number
  depth: number
}

export function buildPageTree(flat: FlatPage[]): PageTreeNode[] {
  const map = new Map<string, PageTreeNode>()
  const roots: PageTreeNode[] = []

  flat.sort((a, b) => a.position - b.position)

  for (const page of flat) {
    map.set(page.id, { ...page, children: [] })
  }

  for (const page of flat) {
    if (page.parentId && map.has(page.parentId)) {
      map.get(page.parentId)!.children.push(map.get(page.id)!)
    } else {
      roots.push(map.get(page.id)!)
    }
  }

  return roots
}

export function slugFromTitle(title: string, id: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'untitled'

  return `${base}-${id.slice(0, 6)}`
}

export function extractTextFromBlocks(
  blocks: Record<string, unknown>[],
): string {
  const lines: string[] = []

  function traverse(block: Record<string, unknown>) {
    const content = block.content as Array<{ type: string; text?: string }> | undefined
    if (Array.isArray(content)) {
      const text = content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('')
      if (text) lines.push(text)
    }
    const children = block.children as Record<string, unknown>[] | undefined
    if (Array.isArray(children)) {
      children.forEach(traverse)
    }
  }

  blocks.forEach(traverse)
  return lines.join('\n')
}

export function extractHeadingsFromBlocks(blocks: Record<string, unknown>[]) {
  const headings: { id: string; text: string; level: number }[] = []

  function textFromContent(content: unknown): string {
    if (!Array.isArray(content)) return ''
    return content
      .map((item) => {
        if (typeof item !== 'object' || item === null) return ''
        const node = item as { type?: string; text?: string; content?: unknown }
        if (node.type === 'text') return node.text ?? ''
        if (node.type === 'link') return textFromContent(node.content)
        return ''
      })
      .join('')
  }

  function traverse(block: Record<string, unknown>) {
    if (block.type === 'heading') {
      const props = block.props as { level?: number } | undefined
      const text = textFromContent(block.content)
      if (text) {
        headings.push({
          id: String(block.id ?? text.toLowerCase().replace(/\s+/g, '-')),
          text,
          level: Math.min(Math.max(Number(props?.level ?? 2), 1), 6),
        })
      }
    }

    const children = block.children as Record<string, unknown>[] | undefined
    if (Array.isArray(children)) children.forEach(traverse)
  }

  blocks.forEach(traverse)
  return headings
}

export function extractWikiLinkSlugsFromBlocks(blocks: Record<string, unknown>[]) {
  const slugs = new Set<string>()

  function maybeAddHref(href: unknown) {
    if (typeof href !== 'string') return
    const match = href.match(/^\/wiki\/(.+)$/)
    if (match?.[1]) slugs.add(decodeURIComponent(match[1]))
  }

  function traverseInline(content: unknown) {
    if (!Array.isArray(content)) return
    for (const item of content) {
      if (typeof item !== 'object' || item === null) continue
      const node = item as {
        type?: string
        href?: unknown
        attrs?: { href?: unknown }
        marks?: Array<{ attrs?: { href?: unknown } }>
        content?: unknown
      }

      maybeAddHref(node.href)
      maybeAddHref(node.attrs?.href)
      node.marks?.forEach((mark) => maybeAddHref(mark.attrs?.href))
      traverseInline(node.content)
    }
  }

  function traverseBlock(block: Record<string, unknown>) {
    traverseInline(block.content)
    const children = block.children as Record<string, unknown>[] | undefined
    if (Array.isArray(children)) children.forEach(traverseBlock)
  }

  blocks.forEach(traverseBlock)
  return [...slugs]
}

export function getAncestors(
  pages: FlatPage[],
  pageId: string,
): FlatPage[] {
  const map = new Map(pages.map((p) => [p.id, p]))
  const ancestors: FlatPage[] = []
  let current = map.get(pageId)

  while (current?.parentId) {
    const parent = map.get(current.parentId)
    if (!parent) break
    ancestors.unshift(parent)
    current = parent
  }

  return ancestors
}
