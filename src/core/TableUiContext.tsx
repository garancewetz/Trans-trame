import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type TableTabId = 'books' | 'authors' | 'links'
export type DrawerTool = 'history' | 'review' | null

type TableUiContextValue = {
  lastEditedNodeId: string | null
  flashNodeIds: Set<string> | null
  setLastEditedNodeId: (id: string | null) => void
  setFlashNodeIds: (ids: Set<string> | null) => void
}

const TableUiContext = createContext<TableUiContextValue | null>(null)

export function TableUiProvider({ children }: { children: ReactNode }) {
  const [lastEditedNodeId, setLastEditedNodeId] = useState<string | null>(null)
  const [flashNodeIds, setFlashNodeIds] = useState<Set<string> | null>(null)

  const value = useMemo<TableUiContextValue>(() => ({
    lastEditedNodeId, flashNodeIds,
    setLastEditedNodeId, setFlashNodeIds,
  }), [lastEditedNodeId, flashNodeIds])

  return (
    <TableUiContext.Provider value={value}>
      {children}
    </TableUiContext.Provider>
  )
}

export function useTableUi() {
  const ctx = useContext(TableUiContext)
  if (!ctx) throw new Error('useTableUi must be inside <TableUiProvider>')
  return ctx
}
