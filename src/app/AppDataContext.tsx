import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { AXES_COLORS } from '@/lib/categories'
import useGraphData from '../features/graph/hooks/useGraphData'

type AppDataValue = ReturnType<typeof useGraphData>

const AppDataContext = createContext<AppDataValue | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const value = useGraphData({ axesColors: AXES_COLORS })
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used within <AppDataProvider>')
  return ctx
}

