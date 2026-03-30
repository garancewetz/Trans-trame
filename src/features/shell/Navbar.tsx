import { useEffect, useRef, useState } from 'react'
import { BarChart3, LayoutGrid, BookOpen, Search, PenLine, X, Users } from 'lucide-react'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Logo from '../../components/Logo'
import ViewSelector from './ViewSelector'
import { bookAuthorDisplay } from '@/lib/authorUtils'
import CountBadge from '../../components/ui/CountBadge'

const BTN_BASE =
  'cursor-pointer rounded-lg border border-white/15 bg-white/5 px-[16px] py-[6px] text-[0.76rem] font-semibold text-white/70 backdrop-blur-lg transition-all'

export default function Navbar({ search, filters, view, catalogue }) {
  const {
    ref: searchRef,
    query: globalSearch,
    setQuery: setGlobalSearch,
    focused: searchFocused,
    setFocused: setSearchFocused,
    results: searchResults,
    onSelect: handleSearchSelect,
    axesGradient,
    authorsMap,
    onOpenTable,
  } = search

  const {
    category: activeFilter,
    clearCategory: clearActiveFilter,
    timelineRange,
    hasTimelineFilter,
    clearTimelineFilter,
    selectedAuthorId,
    selectedAuthorName,
    clearSelectedAuthor,
  } = filters

  const {
    mode: viewMode,
    onChange: onViewChange,
    tableMode,
    onToggleTable: onToggleTableMode,
  } = view

  const {
    onOpenTexts: onOpenTextsPanel,
    onOpenAuthors: onOpenAuthorsPanel,
    onOpenAnalysis: onOpenAnalysisPanel,
    graphData,
    authorCount,
  } = catalogue

  const groupsRef = useRef<HTMLDivElement | null>(null)
  const [openGroup, setOpenGroup] = useState<'catalogue' | null>(null)
  type FilterPill = { key: string; prefix: string; value: string; clear: () => void }
  const activeFilterItems: FilterPill[] = [
    activeFilter
      ? {
          key: 'category',
          prefix: 'Catégorie',
          value: activeFilter,
          clear: () => clearActiveFilter?.(),
        }
      : null,
    selectedAuthorId
      ? {
          key: 'author',
          prefix: 'Auteur·ice',
          value: selectedAuthorName || selectedAuthorId,
          clear: () => clearSelectedAuthor?.(),
        }
      : null,
    hasTimelineFilter
      ? {
          key: 'timeline',
          prefix: 'Période',
          value: `${timelineRange.start}–${timelineRange.end}`,
          clear: () => clearTimelineFilter?.(),
        }
      : null,
  ].filter((x): x is FilterPill => x != null)

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = groupsRef.current
      const t = e.target
      if (!el || !(t instanceof Node) || !el.contains(t)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return (
    <>
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[rgba(5,9,28,0.75)] px-4 backdrop-blur-xl *:pointer-events-auto">
      <div className="flex items-center justify-between gap-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <h1 className="flex items-center gap-2 text-[0.95rem] font-semibold text-white/90">
            <Logo />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2">
                Trans-Trame
                <CountBadge
                  count={graphData.nodes.length}
                  className="bg-white/10 px-[7px] py-px text-[0.65rem] font-bold text-white/50"
                />
              </span>
              <span className="text-[0.72rem] font-semibold text-white/50">
                Cartographie de l'Intersectionnalité
              </span>
            </span>
          </h1>
          <ViewSelector currentView={viewMode} onViewChange={onViewChange} inline discreet />
          <Button
            className={[
              'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-[10px] py-[5px] text-[0.72rem] font-semibold backdrop-blur-lg transition-all',
              tableMode
                ? 'border-[rgba(0,255,135,0.5)] bg-[rgba(0,255,135,0.12)] text-[#00FF87]'
                : 'border-white/10 bg-white/5 text-white/45 hover:border-white/20 hover:text-white/80',
            ].join(' ')}
            onClick={onToggleTableMode}
            type="button"
            title={tableMode ? 'Retour au graphe' : 'Contribuer — Ajouter et tisser des liens'}
          >
            <PenLine size={13} />
            Contribuer
          </Button>
        </div>

          {/* Global search */}
          <div className="relative w-80 shrink-0 md:w-[420px]" ref={searchRef}>
            <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-white/25">
              <Search size={15} />
            </div>
            <SearchInput
              className="w-full rounded-[10px] border border-white/10 bg-white/5 px-9 py-[9px] text-[0.82rem] text-white outline-none backdrop-blur-lg transition-all placeholder:text-white/25 focus:border-[rgba(168,130,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(168,130,255,0.08)]"
              type="text"
              placeholder="Rechercher un ouvrage ou un·e auteur·ice…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
            />
            {globalSearch && (
              <Button
                className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent px-1.5 py-0.5 text-white/30 hover:text-white"
                onClick={() => {
                  setGlobalSearch('')
                  setSearchFocused(false)
                }}
                type="button"
              >
                <X size={16} />
              </Button>
            )}

            {/* Dropdown */}
            {searchFocused && globalSearch.trim() && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[300px] overflow-y-auto rounded-xl border border-white/10 bg-[rgba(12,6,28,0.95)] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
                {searchResults.length === 0 ? (
                  <div className="p-2">
                    <p className="px-2 py-2 text-center text-[0.8rem] text-white/30">
                      Aucun r&eacute;sultat trouv&eacute;
                    </p>
                    <Button
                      className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-transparent px-3 py-3 text-center text-[0.84rem] font-semibold text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                      onClick={() => {
                        onOpenTable?.('books')
                        setGlobalSearch('')
                        setSearchFocused(false)
                      }}
                      type="button"
                    >
                      Ajouter un ouvrage ?
                    </Button>
                  </div>
                ) : (
                  searchResults.map((item, idx) => {
                    if (item.kind === 'author') {
                      return (
                        <Button
                          key={`author-${item.author}-${idx}`}
                          className="flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-lg bg-transparent px-3 py-2.5 text-left text-white transition-colors hover:bg-[rgba(168,130,255,0.12)]"
                          onClick={() => handleSearchSelect(item)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <strong className="truncate text-[0.84rem] font-semibold">{item.author}</strong>
                            <span className="block text-[0.72rem] text-white/35">Auteur·ice</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.7rem] font-semibold text-white/60 tabular-nums">
                            {item.count}
                          </span>
                        </Button>
                      )
                    }

                    const node = item.node
                    return (
                      <Button
                        key={node.id}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg bg-transparent px-3 py-2.5 text-left text-white transition-colors hover:bg-[rgba(168,130,255,0.12)]"
                        onClick={() => handleSearchSelect(item)}
                        type="button"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: axesGradient(node.axes) }}
                        />
                        <span className="flex min-w-0 flex-col gap-px">
                          <strong className="truncate text-[0.84rem] font-semibold">{node.title}</strong>
                          <span className="text-[0.72rem] text-white/35">
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

        <div className="relative flex items-center gap-2" ref={groupsRef}>
          <Button
            className={[
              BTN_BASE,
              'hover:border-[rgba(130,200,255,0.5)] hover:bg-[rgba(130,200,255,0.2)] hover:text-white',
              openGroup === 'catalogue' ? 'border-[rgba(130,200,255,0.6)] bg-[rgba(130,200,255,0.25)] text-white' : '',
            ].join(' ')}
            onClick={() => {
              setOpenGroup((prev) => (prev === 'catalogue' ? null : 'catalogue'))
            }}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <LayoutGrid size={14} />
              Catalogue
            </span>
          </Button>
          {openGroup === 'catalogue' && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[280px] flex-col gap-1 rounded-xl border border-white/10 bg-[rgba(12,6,28,0.95)] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <Button
                className={[BTN_BASE, 'w-full hover:border-[rgba(130,200,255,0.5)] hover:bg-[rgba(130,200,255,0.2)] hover:text-white'].join(' ')}
                onClick={() => { onOpenTextsPanel(); setOpenGroup(null) }}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen size={14} />
                  Textes
                  <CountBadge
                    count={graphData.nodes.length}
                    className="bg-white/15 px-[7px] py-px text-[0.68rem] font-bold text-white/90"
                  />
                </span>
              </Button>
              <Button
                className={[
                  BTN_BASE,
                  'w-full hover:border-[rgba(255,180,130,0.5)] hover:bg-[rgba(255,180,130,0.2)] hover:text-white',
                  selectedAuthorId ? 'border-[rgba(255,180,130,0.6)] bg-[rgba(255,180,130,0.35)] text-white' : '',
                ].join(' ')}
                onClick={() => { onOpenAuthorsPanel(); setOpenGroup(null) }}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  <Users size={14} />
                  Auteur·ices
                  <span className="rounded-full bg-white/15 px-[7px] py-px text-[0.68rem] font-bold tabular-nums text-white/90">
                    {authorCount}
                  </span>
                </span>
              </Button>
              <Button
                className={[BTN_BASE, 'w-full hover:border-[rgba(90,200,255,0.5)] hover:bg-[rgba(90,200,255,0.2)] hover:text-white'].join(' ')}
                onClick={() => { onOpenAnalysisPanel?.(); setOpenGroup(null) }}
                type="button"
              >
                <span className="inline-flex items-center gap-2">
                  <BarChart3 size={14} /> Analyse
                </span>
              </Button>
            </div>
          )}

        </div>
      </div>

    </header>

    {/* Active filter pills — float below navbar, outside header flow */}
    {activeFilterItems.length > 0 && (
      <div className="pointer-events-auto fixed left-0 right-0 top-[49px] z-30 flex items-center gap-2 px-4 pb-2 pt-3.5">
        {activeFilterItems.map((item) => (
          <span
            key={item.key}
            className="inline-flex max-w-[min(100%,22rem)] items-center gap-2 rounded-lg border border-white/25 bg-[rgba(10,16,38,0.92)] px-1.5 py-1 pl-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl backdrop-saturate-150"
          >
            <span className="flex min-w-0 flex-1 items-baseline gap-2">
              <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white/50">
                {item.prefix}
              </span>
              <span className="min-w-0 truncate text-[0.82rem] font-medium text-white">{item.value}</span>
            </span>
            <Button
              type="button"
              onClick={item.clear}
              aria-label={`Retirer le filtre ${item.prefix} : ${item.value}`}
              className="shrink-0 cursor-pointer rounded-md p-1.5 text-white/55 transition-colors hover:bg-white/12 hover:text-white"
            >
              <X size={13} strokeWidth={2} />
            </Button>
          </span>
        ))}
      </div>
    )}
    </>
  )
}
