import { useRef } from 'react'
import { BookPlus, Link2, BookOpen, Search, X, Users } from 'lucide-react'
import Button from './ui/Button'
import SearchInput from './ui/SearchInput'
import Logo from './Logo'
import { authorName } from '../authorUtils'

const BTN_BASE =
  'cursor-pointer rounded-lg border border-white/15 bg-white/5 px-[18px] py-[7px] text-[0.78rem] font-semibold text-white/70 backdrop-blur-lg transition-all'

export default function Navbar({
  searchRef,
  globalSearch,
  setGlobalSearch,
  searchFocused,
  setSearchFocused,
  searchResults,
  handleSearchSelect,
  axesGradient,
  panelTab,
  setPanelTab,
  handleClosePanel,
  setPreviousPanelTab,
  setSelectedNode,
  setSelectedLink,
  onOpenTextsPanel,
  onOpenAuthorsPanel,
  graphData,
  selectedAuthor,
  authorCount,
}) {
  const ouvragesRef = useRef(null)

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 border-b border-white/10 bg-[rgba(5,9,28,0.75)] px-4 py-2.5 backdrop-blur-xl *:pointer-events-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-[0.95rem] font-semibold text-white/90">
            <Logo />
            Trans-Trame
          </h1>
        </div>

        {/* Global search */}
        <div className="relative w-72 shrink-0" ref={searchRef}>
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
                    setSelectedNode(null)
                    setSelectedLink(null)
                    setPanelTab('book')
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
                        {authorName(node)}, {node.year}
                      </span>
                    </span>
                  </Button>
                )
              })
            )}
          </div>
        )}
        </div>

        {/* Browse: Ouvrages & Auteur·ices */}
        <div className="flex gap-2" ref={ouvragesRef}>
          <button
            className={[BTN_BASE, 'hover:border-[rgba(130,200,255,0.5)] hover:bg-[rgba(130,200,255,0.2)] hover:text-white'].join(' ')}
            onClick={onOpenTextsPanel}
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen size={14} />
              Ouvrages
              <span className="rounded-full bg-white/15 px-[7px] py-px text-[0.68rem] font-bold tabular-nums text-white/90">
                {graphData.nodes.length}
              </span>
            </span>
          </button>

          <button
            className={[
              BTN_BASE,
              'hover:border-[rgba(255,180,130,0.5)] hover:bg-[rgba(255,180,130,0.2)] hover:text-white',
              selectedAuthor ? 'border-[rgba(255,180,130,0.6)] bg-[rgba(255,180,130,0.35)] text-white' : '',
            ].join(' ')}
            onClick={onOpenAuthorsPanel}
          >
            <span className="inline-flex items-center gap-2">
              <Users size={14} />
              Auteur·ices
              <span className="rounded-full bg-white/15 px-[7px] py-px text-[0.68rem] font-bold tabular-nums text-white/90">
                {authorCount}
              </span>
            </span>
          </button>
        </div>

        {/* Actions: Ajouter */}
        <div className="flex gap-2">
        <button
          className={[
            BTN_BASE,
            'hover:border-[rgba(168,85,247,0.5)] hover:bg-[rgba(168,85,247,0.25)] hover:text-white',
            panelTab === 'book' ? 'border-[rgba(168,85,247,0.6)] bg-[rgba(168,85,247,0.35)] text-white' : '',
          ].join(' ')}
          onClick={() => {
            if (panelTab === 'book') {
              setPanelTab('details')
              handleClosePanel()
            } else {
              setSelectedNode(null)
              setSelectedLink(null)
              setPanelTab('book')
            }
          }}
        >
          <span className="inline-flex items-center gap-2">
            <BookPlus size={14} /> Ajouter une référence
          </span>
        </button>
        <button
          className={[
            BTN_BASE,
            'hover:border-[rgba(217,70,239,0.5)] hover:bg-[rgba(217,70,239,0.25)] hover:text-white',
            panelTab === 'link' ? 'border-[rgba(217,70,239,0.6)] bg-[rgba(217,70,239,0.35)] text-white' : '',
          ].join(' ')}
          onClick={() => {
            if (panelTab === 'link') {
              setPanelTab('details')
              handleClosePanel()
            } else {
              setPreviousPanelTab(panelTab)
              setSelectedNode(null)
              setSelectedLink(null)
              setPanelTab('link')
            }
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Link2 size={14} /> Ajouter un lien
          </span>
        </button>
        </div>
      </div>
    </header>
  )
}
