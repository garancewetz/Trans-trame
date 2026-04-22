import { useCallback } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { SearchInputWithClear } from '@/common/components/ui/SearchInputWithClear'
import { Logo } from '@/common/components/Logo'
import { ViewSelector } from './ViewSelector'
import { NavbarCatalogueMenu } from './NavbarCatalogueMenu'
import { NavbarAuthButtons } from './NavbarAuthButtons'
import { bookAuthorDisplay } from '@/common/utils/authorUtils'
import { axesGradient } from '@/common/utils/categories'
import { Badge } from '@/common/components/ui/Badge'
import { ADMIN_ROUTE } from '@/common/utils/adminUrl'
import { useAppData } from '@/core/AppDataContext'
import { useFilter } from '@/core/FilterContext'
import { usePanelVisibility } from '@/core/PanelVisibilityContext'
import { useSelection } from '@/core/SelectionContext'
import { useAuthActions, useAuthState } from '@/core/AuthContext'
import { useGlobalSearch } from '@/features/shell/hooks/useGlobalSearch'

type NavbarProps = {
  viewMode: string
  onViewChange: (mode: string) => void
}

const VIEW_MODE_LABELS: Record<string, string> = {
  transmissions: 'Transmissions',
  categories: 'Catégories',
  chronological: 'Chronologie',
}

export function Navbar({ viewMode, onViewChange }: NavbarProps) {
  const { user, profile } = useAuthState()
  const { signOut, requireAuth } = useAuthActions()
  const appData = useAppData()
  const { graphData, authorsMap, authorCount } = appData
  const filter = useFilter()
  const selectedAuthorId = filter.selectedAuthor
  const { openTextsPanel, openAuthorsPanel, openAnalysisPanel } = usePanelVisibility()
  const selection = useSelection()
  const navigate = useNavigate()
  const isAdminRoute = Boolean(useMatch('/admin/*'))

  const onSelectNode = useCallback(
    (node: Parameters<typeof selection.selectNode>[0]) => {
      selection.selectNode(node)
      filter.setSelectedAuthor(null)
    },
    [selection, filter],
  )

  const onSelectAuthor = useCallback(
    (authorId: string) => {
      selection.closePanel()
      filter.toggleSelectedAuthor(authorId)
    },
    [selection, filter],
  )

  const {
    searchRef,
    globalSearch,
    setGlobalSearch,
    searchFocused,
    setSearchFocused,
    searchResults,
    handleSearchSelect,
  } = useGlobalSearch({
    nodes: graphData.nodes,
    authors: appData.authors,
    onSelectNode,
    onSelectAuthor,
  })

  const onToggleTableMode = useCallback(
    () => {
      if (isAdminRoute) { navigate('/'); return }
      if (!requireAuth()) return
      navigate(ADMIN_ROUTE)
    },
    [isAdminRoute, navigate, requireAuth],
  )

  const onOpenAnalysisPanel = useCallback(
    () => {
      selection.closePanel()
      openAnalysisPanel()
    },
    [selection, openAnalysisPanel],
  )

  return (
    <>
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-bg-overlay/75 px-4 backdrop-blur-xl *:pointer-events-auto">
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="flex items-center gap-2 text-[0.95rem] font-semibold text-white/90">
            <Logo />
            <span className="hidden min-w-0 flex-col md:flex">
              <span className="flex items-center gap-2">
                Trans-Trame
                <Badge
                  variant="count"
                  count={graphData.nodes.length}
                  className="bg-white/10 px-[7px] py-px text-caption font-bold text-white/50"
                />
              </span>
              <span className="text-label font-semibold text-white/45">
                {VIEW_MODE_LABELS[viewMode] ?? 'Transmissions'}
              </span>
            </span>
          </h1>
          <div className="hidden md:inline-flex">
            <ViewSelector currentView={viewMode} onViewChange={onViewChange} inline discreet />
          </div>
          <Button
            variant="outline"
            frosted
            size="sm"
            tone="mint"
            active={isAdminRoute}
            icon={<PenLine size={13} />}
            onClick={onToggleTableMode}
            type="button"
            title={isAdminRoute ? 'Retour au graphe' : 'Contribuer — Ajouter et tisser des liens'}
            className="hidden md:inline-flex"
          >
            Contribuer
          </Button>
        </div>

          {/* Global search */}
          <div className="relative min-w-0 flex-1 md:w-[420px] md:flex-none" ref={searchRef}>
            <SearchInputWithClear
              placeholder="Rechercher une ressource ou un·e auteur·ice…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onClear={() => {
                setGlobalSearch('')
                setSearchFocused(false)
              }}
              onFocus={() => setSearchFocused(true)}
              focusTone="violet"
            />

            {/* Dropdown */}
            {searchFocused && globalSearch.trim() && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[300px] overflow-y-auto rounded-xl border border-white/10 bg-bg-overlay/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                {searchResults.length === 0 ? (
                  <div className="p-2">
                    <p className="px-2 py-2 text-center text-[0.9rem] text-white/30">
                      Aucun résultat trouvé
                    </p>
                    <Button
                      variant="ghost"
                      layout="banner"
                      onClick={() => {
                        if (!requireAuth()) return
                        navigate(ADMIN_ROUTE)
                        setGlobalSearch('')
                        setSearchFocused(false)
                      }}
                      type="button"
                    >
                      Ajouter une ressource ?
                    </Button>
                  </div>
                ) : (
                  searchResults.map((item, idx) => {
                    if (item.kind === 'author') {
                      return (
                        <Button
                          key={`author-${item.author}-${idx}`}
                          variant="ghost"
                          layout="row"
                          tone="violet"
                          className="justify-between"
                          onClick={() => handleSearchSelect(item)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <strong className="truncate text-body font-semibold">{item.author}</strong>
                            <span className="block text-label text-white/35">Auteur·ice</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.8rem] font-semibold text-white/60 tabular-nums">
                            {item.count}
                          </span>
                        </Button>
                      )
                    }

                    const node = item.node
                    return (
                      <Button
                        key={node.id}
                        variant="ghost"
                        layout="row"
                        tone="violet"
                        onClick={() => handleSearchSelect(item)}
                        type="button"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: axesGradient(node.axes) }}
                        />
                        <span className="flex min-w-0 flex-col gap-px">
                          <strong className="truncate text-body font-semibold">{node.title}</strong>
                          <span className="text-label text-white/35">
                            {bookAuthorDisplay(node, authorsMap)}, {node.year}
                          </span>
                        </span>
                      </Button>
                    )
                  })
                )}
              </div>
            )}
          </div>

        <div className="flex items-center gap-2">
          <NavbarCatalogueMenu
            nodeCount={graphData.nodes.length}
            authorCount={authorCount}
            selectedAuthorId={selectedAuthorId}
            onOpenTextsPanel={openTextsPanel}
            onOpenAuthorsPanel={openAuthorsPanel}
            onOpenAnalysisPanel={onOpenAnalysisPanel}
          />
          <NavbarAuthButtons
            user={user}
            profile={profile}
            onSignOut={signOut}
            onRequireAuth={requireAuth}
          />
        </div>
      </div>

    </header>

    </>
  )
}
