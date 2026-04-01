import { useEffect, useState } from 'react'

/** Animation d'entrée du volet table (opacity / translate). */
export function useTableViewVisibility() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    queueMicrotask(() => setVisible(true))
  }, [])
  return visible
}
