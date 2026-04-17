import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type TableUiContextValue = {
  tableMode: boolean
  tableInitialTab: string
  tableLinkSourceId: string | null
  tableFocusBookId: string | null
  lastEditedNodeId: string | null
  flashNodeIds: Set<string> | null
  setTableMode: (v: boolean) => void
  setTableInitialTab: (t: string) => void
  setTableLinkSourceId: (id: string | null) => void
  setTableFocusBookId: (id: string | null) => void
  setLastEditedNodeId: (id: string | null) => void
  setFlashNodeIds: (ids: Set<string> | null) => void
  openTable: (tab?: 'books' | 'authors' | 'links' | 'history' | 'review', linkSourceId?: string | null, focusBookId?: string | null) => void
}

const TableUiContext = createContext<TableUiContextValue | null>(null)

export function TableUiProvider({ children }: { children: ReactNode }) {
  const [tableMode, setTableMode] = useState(false)
  const [tableInitialTab, setTableInitialTab] = useState('books')
  const [tableLinkSourceId, setTableLinkSourceId] = useState<string | null>(null)
  const [tableFocusBookId, setTableFocusBookId] = useState<string | null>(null)
  const [lastEditedNodeId, setLastEditedNodeId] = useState<string | null>(null)
  const [flashNodeIds, setFlashNodeIds] = useState<Set<string> | null>(null)

  const openTable = useCallback(
    (tab: 'books' | 'authors' | 'links' | 'history' | 'review' = 'books', linkSourceId: string | null = null, focusBookId: string | null = null) => {
      setTableInitialTab(tab)
      setTableLinkSourceId(linkSourceId)
      setTableFocusBookId(focusBookId)
      setTableMode(true)
    },
    [],
  )

  const value = useMemo<TableUiContextValue>(() => ({
    tableMode, tableInitialTab, tableLinkSourceId, tableFocusBookId,
    lastEditedNodeId, flashNodeIds,
    setTableMode, setTableInitialTab, setTableLinkSourceId, setTableFocusBookId,
    setLastEditedNodeId, setFlashNodeIds,
    openTable,
  }), [tableMode, tableInitialTab, tableLinkSourceId, tableFocusBookId, lastEditedNodeId, flashNodeIds, openTable])

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
