import { useEffect, useMemo, useRef, useState } from 'react'
import { BookPlus, Link2, BookOpen } from 'lucide-react'
import Button from './ui/Button'
import SearchInput from './ui/SearchInput'
import Logo from './Logo'

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
  graphData,
}) {
  const [ouvragesOpen, setOuvragesOpen] = useState(false)
  const ouvragesRef = useRef(null)

  const sortedBooks = useMemo(
    () =>
      [...graphData.nodes].sort((a, b) =>
        (a.author || '').localeCompare(b.author || '', 'fr', { sensitivity: 'base' }),
      ),
    [graphData.nodes],
  )

  useEffect(() => {
    function handleClickOutside(e) {
      if (ouvragesRef.current && !ouvragesRef.current.contains(e.target)) {
        setOuvragesOpen(false)
      }
    }
    if (ouvragesOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ouvragesOpen])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-linear-to-b from-[rgba(6,3,15,0.85)] to-transparent px-6 py-3.5 *:pointer-events-auto">
      <h1 className="flex items-center gap-2 text-[1.1rem] font-bold uppercase tracking-[3px] text-white/85 [text-shadow:0_0_20px_rgba(160,80,255,0.4)]">
        <Logo />
        TRANS TRAME
      </h1>

      {/* Global search */}
      <div className="relative w-80 shrink-0" ref={searchRef}>
        <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-white/25">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <SearchInput
          className="w-full rounded-[10px] border border-white/10 bg-white/5 px-9 py-[9px] text-[0.82rem] text-white outline-none backdrop-blur-lg transition-all placeholder:text-white/25 focus:border-[rgba(168,130,255,0.4)] focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(168,130,255,0.08)]"
          type="text"
          placeholder="Rechercher un ouvrage..."
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          onFocus={() => setSearchFocused(true)}
        />
        {globalSearch && (
          <Button
            className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent px-1.5 py-0.5 text-[18px] leading-none text-white/30 hover:text-white"
            onClick={() => {
              setGlobalSearch('')
              setSearchFocused(false)
            }}
            type="button"
          >
            &times;
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
              searchResults.map((node) => (
                <Button
                  key={node.id}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg bg-transparent px-3 py-2.5 text-left text-white transition-colors hover:bg-[rgba(168,130,255,0.12)]"
                  onClick={() => handleSearchSelect(node)}
                  type="button"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: axesGradient(node.axes) }}
                  />
                  <span className="flex min-w-0 flex-col gap-px">
                    <strong className="truncate text-[0.84rem] font-semibold">{node.title}</strong>
                    <span className="text-[0.72rem] text-white/35">
                      {node.author}, {node.year}
                    </span>
                  </span>
                </Button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Ouvrages catalogue */}
      <div className="relative" ref={ouvragesRef}>
        <button
          className={[
            'cursor-pointer rounded-lg border border-white/15 bg-white/5 px-[18px] py-[7px] text-[0.78rem] font-semibold text-white/70 backdrop-blur-lg transition-all',
            'hover:border-[rgba(130,200,255,0.5)] hover:bg-[rgba(130,200,255,0.2)] hover:text-white',
            ouvragesOpen ? 'border-[rgba(130,200,255,0.6)] bg-[rgba(130,200,255,0.25)] text-white' : '',
          ].join(' ')}
          onClick={() => setOuvragesOpen((v) => !v)}
        >
          <span className="inline-flex items-center gap-2">
            <BookOpen size={14} />
            Ouvrages
            <span className="rounded-full bg-white/15 px-[7px] py-px text-[0.68rem] font-bold tabular-nums text-white/90">
              {graphData.nodes.length}
            </span>
          </span>
        </button>

        {ouvragesOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 max-h-[420px] w-[340px] overflow-y-auto rounded-xl border border-white/10 bg-[rgba(12,6,28,0.95)] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
            <p className="px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-white/30">
              {graphData.nodes.length} ouvrages — par auteur·ice
            </p>
            {sortedBooks.map((node) => (
              <Button
                key={node.id}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg bg-transparent px-3 py-2.5 text-left text-white transition-colors hover:bg-[rgba(168,130,255,0.12)]"
                onClick={() => {
                  handleSearchSelect(node)
                  setOuvragesOpen(false)
                }}
                type="button"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: axesGradient(node.axes) }}
                />
                <span className="flex min-w-0 flex-col gap-px">
                  <strong className="truncate text-[0.84rem] font-semibold">{node.author}</strong>
                  <span className="text-[0.72rem] text-white/35">
                    {node.title}{node.year ? ` (${node.year})` : ''}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className={[
            'cursor-pointer rounded-lg border border-white/15 bg-white/5 px-[18px] py-[7px] text-[0.78rem] font-semibold text-white/70 backdrop-blur-lg transition-all',
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
            'cursor-pointer rounded-lg border border-white/15 bg-white/5 px-[18px] py-[7px] text-[0.78rem] font-semibold text-white/70 backdrop-blur-lg transition-all',
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
    </header>
  )
}
