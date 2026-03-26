const STORAGE_KEY = 'trans_trame_data'

export const AXES_MIGRATION = {
  'CORPS / QUEER': 'QUEER',
  'RACES / ÉPISTÉMÈ': 'AFRO-FÉMINISTE',
  'TERRES / SYSTÈMES': 'ÉCOFÉMINISTE',
  'MÉMOIRES / RÉCITS': 'HISTOIRE',
}

export function migrateAxes(axes) {
  if (!Array.isArray(axes)) return axes
  return axes.map((a) => AXES_MIGRATION[a] ?? a)
}

export function sanitizeAxes(axes, axesColors) {
  if (!Array.isArray(axes)) return []
  const allowed = new Set(Object.keys(axesColors))
  return axes.filter((a) => allowed.has(a))
}

export function sanitizeNode(node, axesColors) {
  if (!node || typeof node !== 'object') return node
  return { ...node, axes: sanitizeAxes(node.axes, axesColors) }
}

export function normalizeId(v) {
  if (v && typeof v === 'object') return v.id
  return v
}

export function serializeGraphData(data) {
  const nodes = Array.isArray(data?.nodes) ? data.nodes : []
  const links = Array.isArray(data?.links) ? data.links : []

  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      author: n.author,
      year: n.year,
      axes: n.axes,
      description: n.description,
    })),
    links: links.map((l) => ({
      source: normalizeId(l.source),
      target: normalizeId(l.target),
      citation_text: l.citation_text,
      page: l.page,
      context: l.context,
    })),
  }
}

export function loadGraphData({ defaultData, axesColors, storageKey = STORAGE_KEY }) {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      if (stored.length > 5_000_000) {
        localStorage.removeItem(storageKey)
        return {
          nodes: defaultData.nodes.map((n) => sanitizeNode(n, axesColors)),
          links: [...defaultData.links],
        }
      }
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.links)) {
        const hasOldFormat = parsed.nodes.some((n) => n.category && !n.axes)
        if (hasOldFormat) {
          localStorage.removeItem(storageKey)
          return {
            nodes: defaultData.nodes.map((n) => sanitizeNode(n, axesColors)),
            links: [...defaultData.links],
          }
        }

        const needsAxesMigration = parsed.nodes.some((n) => (n.axes || []).some((a) => a in AXES_MIGRATION))
        if (needsAxesMigration) {
          parsed.nodes = parsed.nodes.map((n) => ({ ...n, axes: migrateAxes(n.axes) }))
        }

        return {
          nodes: parsed.nodes.map((n) => sanitizeNode(n, axesColors)),
          links: parsed.links,
        }
      }
    }
  } catch {
    // Données corrompues — on repart des données par défaut
  }
  return {
    nodes: defaultData.nodes.map((n) => sanitizeNode(n, axesColors)),
    links: [...defaultData.links],
  }
}

export function persistGraphDataToLocalStorage(graphData, storageKey = STORAGE_KEY) {
  try {
    const payload = serializeGraphData(graphData)
    const json = JSON.stringify(payload)
    const bytes = new Blob([json]).size
    if (bytes > 4_500_000) {
      console.warn(`[trans_trame] Sauvegarde ignorée: ${Math.round(bytes / 1024)}KB > quota localStorage`)
      return
    }
    localStorage.setItem(storageKey, json)
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      console.warn('[trans_trame] Quota localStorage dépassé: sauvegarde ignorée')
      return
    }
    console.warn('[trans_trame] Erreur de sauvegarde localStorage', e)
  }
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'trans_trame_export.json'
  a.click()
  URL.revokeObjectURL(url)
}
