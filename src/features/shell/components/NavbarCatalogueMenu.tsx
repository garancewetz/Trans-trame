import { useCallback, useEffect, useRef, useState } from 'react'
import { LayoutGrid, BookOpen, Users, FlaskConical } from 'lucide-react'
import { Button } from '@/common/components/ui/Button'
import { Badge } from '@/common/components/ui/Badge'

type NavbarCatalogueMenuProps = {
  nodeCount: number
  authorCount: number
  selectedAuthorId: string | null
  onOpenTextsPanel: () => void
  onOpenAuthorsPanel: () => void
  onOpenAnalysisPanel: () => void
}

export function NavbarCatalogueMenu({
  nodeCount,
  authorCount,
  selectedAuthorId,
  onOpenTextsPanel,
  onOpenAuthorsPanel,
  onOpenAnalysisPanel,
}: NavbarCatalogueMenuProps) {
  const groupsRef = useRef<HTMLDivElement | null>(null)
  const [openGroup, setOpenGroup] = useState<'catalogue' | null>(null)

  const handleOpenTexts = useCallback(
    () => { onOpenTextsPanel(); setOpenGroup(null) },
    [onOpenTextsPanel],
  )

  const handleOpenAuthors = useCallback(
    () => { onOpenAuthorsPanel(); setOpenGroup(null) },
    [onOpenAuthorsPanel],
  )

  const handleOpenAnalysis = useCallback(
    () => { onOpenAnalysisPanel(); setOpenGroup(null) },
    [onOpenAnalysisPanel],
  )

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
    <div className="relative flex items-center gap-2" ref={groupsRef}>
      <Button
        variant="outline"
        frosted
        tone="cyan"
        active={openGroup === 'catalogue'}
        icon={<LayoutGrid size={14} />}
        onClick={() => {
          setOpenGroup((prev) => (prev === 'catalogue' ? null : 'catalogue'))
        }}
        type="button"
      >
        Catalogue
      </Button>
      {openGroup === 'catalogue' && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 flex min-w-[280px] flex-col gap-1 rounded-xl border border-white/10 bg-bg-overlay/95 p-1 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <Button
            variant="outline"
            frosted
            tone="cyan"
            className="w-full justify-start"
            onClick={handleOpenTexts}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <BookOpen size={14} />
              Textes
              <Badge
                variant="count"
                count={nodeCount}
                className="bg-white/15 px-[7px] py-px text-caption font-bold text-white/90"
              />
            </span>
          </Button>
          <Button
            variant="outline"
            frosted
            tone="amber"
            active={Boolean(selectedAuthorId)}
            className="w-full justify-start"
            onClick={handleOpenAuthors}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Users size={14} />
              Auteur·ices
              <span className="rounded-full bg-white/15 px-[7px] py-px text-caption font-bold tabular-nums text-white/90">
                {authorCount}
              </span>
            </span>
          </Button>
          <Button
            variant="outline"
            frosted
            className="w-full justify-start"
            onClick={handleOpenAnalysis}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <FlaskConical size={14} />
              Analyse
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}
