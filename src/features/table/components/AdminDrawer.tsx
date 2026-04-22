import { Clock, Flag, Layers, X } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import type { AuthorNode } from '@/common/utils/authorUtils'
import type { Author, AuthorId, Book, BookId, Link } from '@/types/domain'
import type { DrawerTool } from '@/core/TableUiContext'
import { HistoryTab } from './tabs/HistoryTab'
import { ReviewTab } from './tabs/ReviewTab'
import { SubAxesTab } from './tabs/SubAxesTab'

type AdminDrawerProps = {
  tool: Exclude<DrawerTool, null>
  onClose: () => void
  books: Book[]
  links: Link[]
  authors: Author[]
  authorsMap: Map<string, AuthorNode>
  onUpdateBook?: (book: Book) => unknown
  onUpdateAuthor?: (author: Author) => unknown
  onOpenWorkDetail?: (bookId: BookId) => unknown
  onFocusAuthorInAuthorsTab?: (authorId: AuthorId) => unknown
  onOpenAIOrphanReconcile?: () => void
}

const TOOL_CONFIG = {
  history: { icon: Clock, label: 'Historique' },
  review: { icon: Flag, label: 'À relire' },
  subaxes: { icon: Layers, label: 'Autres disciplines' },
} as const

export function AdminDrawer({
  tool,
  onClose,
  books,
  links,
  authors,
  authorsMap,
  onUpdateBook,
  onUpdateAuthor,
  onOpenWorkDetail,
  onFocusAuthorInAuthorsTab,
  onOpenAIOrphanReconcile,
}: AdminDrawerProps) {
  const { icon: Icon, label } = TOOL_CONFIG[tool]

  return (
    <aside className="flex w-[460px] shrink-0 flex-col overflow-hidden border-l border-white/8 bg-bg-overlay/70">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/8 px-4 py-3">
        <Icon size={14} className="text-white/60" />
        <h2 className="text-ui font-medium text-white/80">{label}</h2>
        <span className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          tone="muted"
          icon={<X size={12} />}
          onClick={onClose}
          title="Fermer le panneau"
          aria-label="Fermer le panneau"
        />
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {tool === 'history' && (
          <HistoryTab onOpenAIOrphanReconcile={onOpenAIOrphanReconcile} />
        )}
        {tool === 'review' && (
          <ReviewTab
            books={books}
            authors={authors}
            authorsMap={authorsMap}
            onUpdateBook={onUpdateBook}
            onUpdateAuthor={onUpdateAuthor}
            onOpenWorkDetail={onOpenWorkDetail}
            onFocusAuthorInAuthorsTab={onFocusAuthorInAuthorsTab}
          />
        )}
        {tool === 'subaxes' && (
          <SubAxesTab
            books={books}
            links={links}
            onOpenWorkDetail={onOpenWorkDetail}
          />
        )}
      </div>
    </aside>
  )
}
