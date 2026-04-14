import { useState } from 'react'

type SortDir = 'asc' | 'desc'

export function useColumnSort(defaultCol = 'createdAt', defaultDir: SortDir = 'desc') {
  const [sortCol, setSortCol] = useState(defaultCol)
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir)

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  return { sortCol, sortDir, handleSort }
}
