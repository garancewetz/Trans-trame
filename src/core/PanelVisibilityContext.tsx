import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

type PanelVisibilityContextValue = {
  textsPanelOpen: boolean
  authorsPanelOpen: boolean
  setTextsPanelOpen: (v: boolean) => void
  setAuthorsPanelOpen: (v: boolean) => void
  openTextsPanel: () => void
  openAuthorsPanel: () => void
}

const PanelVisibilityContext = createContext<PanelVisibilityContextValue | null>(null)

export function PanelVisibilityProvider({ children }: { children: ReactNode }) {
  const [textsPanelOpen, setTextsPanelOpen] = useState(false)
  const [authorsPanelOpen, setAuthorsPanelOpen] = useState(false)

  const openTextsPanel = useCallback(() => {
    setAuthorsPanelOpen(false)
    setTextsPanelOpen(true)
  }, [])

  const openAuthorsPanel = useCallback(() => {
    setTextsPanelOpen(false)
    setAuthorsPanelOpen(true)
  }, [])

  return (
    <PanelVisibilityContext.Provider
      value={{
        textsPanelOpen, authorsPanelOpen,
        setTextsPanelOpen, setAuthorsPanelOpen,
        openTextsPanel, openAuthorsPanel,
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
