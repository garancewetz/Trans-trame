import { useMemo, useState } from 'react'
import { Download, Search, X } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { TextInput } from '@/common/components/ui/TextInput'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import type { AuthorNode } from '@/common/utils/authorUtils'
import { matchAllWords } from '@/common/utils/searchUtils'
import {
  downloadJson,
  exportFilename,
} from '@/features/graph/api/graphDataApi'
import type { Author, Book, Link } from '@/types/domain'

type TableFilterBarProps = {
  tab?: string
  search: string
  setSearch: (v: string) => void
  authorSearch: string
  setAuthorSearch: (v: string) => void
  linkSearch: string
  setLinkSearch: (v: string) => void
  nodes: Book[]
  authors: Author[]
  links: Link[]
  authorsMap: Map<string, AuthorNode>
}

export function TableFilterBar({
  tab,
  search,
  setSearch,
  authorSearch,
  setAuthorSearch,
  linkSearch,
  setLinkSearch,
  nodes,
  authors,
  links,
  authorsMap,
}: TableFilterBarProps) {
  const value = tab === 'books' ? search : tab === 'authors' ? authorSearch : linkSearch
  const setValue = tab === 'books' ? setSearch : tab === 'authors' ? setAuthorSearch : setLinkSearch
  const placeholder = tab === 'books' ? 'Filtrer les ouvrages…' : tab === 'authors' ? 'Filtrer les auteur·ices…' : 'Filtrer les liens…'

  const filteredBooks = useMemo(() => {
    const q = search.trim()
    if (!q) return nodes
    return nodes.filter((n) =>
      matchAllWords(q, [n.title || '', bookAuthorDisplay(n, authorsMap), String(n.year || '')].join(' ')),
    )
  }, [nodes, search, authorsMap])

  const filteredAuthors = useMemo(() => {
    const q = authorSearch.toLowerCase().trim()
    if (!q) return authors
    return authors.filter(
      (a) =>
        `${a.firstName ?? ''} ${a.lastName ?? ''}`.toLowerCase().includes(q) ||
        (a.lastName ?? '').toLowerCase().includes(q) ||
        (a.firstName ?? '').toLowerCase().includes(q),
    )
  }, [authors, authorSearch])

  const filteredLinks = useMemo(() => {
    const q = linkSearch.trim()
    if (!q) return links
    return links.filter((l) => {
      const srcId = typeof l.source === 'string' ? l.source : (l.source as { id: string })?.id
      const tgtId = typeof l.target === 'string' ? l.target : (l.target as { id: string })?.id
      const srcNode = nodes.find((n) => n.id === srcId)
      const tgtNode = nodes.find((n) => n.id === tgtId)
      const haystack = [
        srcNode?.title || '',
        tgtNode?.title || '',
        bookAuthorDisplay(srcNode || {}, authorsMap),
        bookAuthorDisplay(tgtNode || {}, authorsMap),
        l.citation_text || l.context || '',
      ].join(' ')
      return matchAllWords(q, haystack)
    })
  }, [links, linkSearch, nodes, authorsMap])

  const handleExport = () => {
    if (tab === 'books') {
      downloadJson(
        { exportedAt: new Date().toISOString(), books: filteredBooks },
        exportFilename('ouvrages'),
      )
    } else if (tab === 'authors') {
      downloadJson(
        { exportedAt: new Date().toISOString(), authors: filteredAuthors },
        exportFilename('auteurs'),
      )
    } else if (tab === 'links') {
      downloadJson(
        { exportedAt: new Date().toISOString(), links: filteredLinks },
        exportFilename('liens'),
      )
    }
  }

  const TAB_LABELS: Record<string, string> = {
    books: 'Ouvrages',
    authors: 'Auteur·ices',
    links: 'Liens',
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-white/6 bg-white/1.5 px-5 py-2">
      <div className="relative w-72">
        <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/22" />
        <TextInput
          variant="table"
          className="rounded-lg border-white/8 bg-white/4 py-1.5 pl-7 pr-6 text-[0.85rem] focus:border-cyan/[0.28] focus:bg-white/6"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {value && (
          <Button
            variant="ghost"
            layout="inline"
            tone="muted"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setValue('')}
            type="button"
          >
            <X size={11} />
          </Button>
        )}
      </div>

      {tab && TAB_LABELS[tab] && (
        <Button
          type="button"
          variant="outline"
          outlineWeight="muted"
          icon={<Download size={11} />}
          onClick={handleExport}
        >
          {`Exporter ${TAB_LABELS[tab]}`}
        </Button>
      )}
    </div>
  )
}
