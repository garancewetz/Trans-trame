import { useState } from 'react'

export function useColumnSort(defaultCol = 'lastName') {
  const [sortCol, setSortCol] = useState(defaultCol)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  return { sortCol, sortDir, handleSort }
}
