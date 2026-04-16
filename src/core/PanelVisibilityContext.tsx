import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type PanelVisibilityContextValue = {
  textsPanelOpen: boolean
  authorsPanelOpen: boolean
  analysisPanelOpen: boolean
  setTextsPanelOpen: (v: boolean) => void
  setAuthorsPanelOpen: (v: boolean) => void
  setAnalysisPanelOpen: (v: boolean) => void
  openTextsPanel: () => void
  openAuthorsPanel: () => void
  openAnalysisPanel: () => void
}

const PanelVisibilityContext = createContext<PanelVisibilityContextValue | null>(null)

export function PanelVisibilityProvider({ children }: { children: ReactNode }) {
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)
  const [authorsPanelOpen, setAuthorsPanelOpen] = useState(false)
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false)

  // Left-side panels are mutex with each other (Textes XOR Auteur·ices).
  // Right-side AnalysisPanel mutex with SidePanel is enforced at callsite
  // (it needs access to SelectionContext).
  const openTextsPanel = useCallback(() => {
    setAuthorsPanelOpen(false)
    setTextsPanelOpen(true)
  }, [])

  const openAuthorsPanel = useCallback(() => {
    setTextsPanelOpen(false)
    setAuthorsPanelOpen(true)
  }, [])

  const openAnalysisPanel = useCallback(() => {
    setAnalysisPanelOpen(true)
  }, [])

  return (
    <PanelVisibilityContext.Provider
      value={{
        textsPanelOpen, authorsPanelOpen, analysisPanelOpen,
        setTextsPanelOpen, setAuthorsPanelOpen, setAnalysisPanelOpen,
        openTextsPanel, openAuthorsPanel, openAnalysisPanel,
      }}
    >
      {children}
    </PanelVisibilityContext.Provider>
  )
}

export function usePanelVisibility() {
  const ctx = useContext(PanelVisibilityContext)
  if (!ctx) throw new Error('usePanelVisibility must be inside <PanelVisibilityProvider>')
  return ctx
}
