import { AXES, AXES_COLORS } from '@/common/utils/categories'

export function computeAxisStats(bookNodes) {
  const counts: Record<string, number> = {}
  for (const axis of AXES) counts[axis] = 0
  for (const node of bookNodes) {
    for (const axis of node.axes || []) {
      if (counts[axis] !== undefined) counts[axis]++
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return AXES.map((axis) => ({
    axis,
    count: counts[axis],
    pct: Math.round((counts[axis] / total) * 100),
    color: AXES_COLORS[axis],
  }))
}

export function computeDensity(bookNodes, links) {
  const ratio = bookNodes.length > 0 ? links.length / bookNodes.length : 0
  let label
  if (ratio >= 2) label = 'Trame Hautement Connectée'
  else if (ratio >= 1) label = 'Trame Connectée'
  else if (ratio >= 0.5) label = 'Maillage Modéré'
  else label = 'Maillage Faible'
  return { ratio: ratio.toFixed(2), links: links.length, nodes: bookNodes.length, label }
}

export function computeSuperNodes(bookNodes, links) {
  const degreeMap: Record<string, number> = {}
  for (const node of bookNodes) degreeMap[node.id] = 0
  for (const link of links) {
    const srcId = typeof link.source === 'object' ? link.source.id : link.source
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target
    if (degreeMap[srcId] !== undefined) degreeMap[srcId]++
    if (degreeMap[tgtId] !== undefined) degreeMap[tgtId]++
  }
  return [...bookNodes]
    .sort((a, b) => (degreeMap[b.id] || 0) - (degreeMap[a.id] || 0))
    .slice(0, 3)
    .map((n) => ({ ...n, degree: degreeMap[n.id] || 0 }))
}

export function computeMostCitedWorks(bookNodes, links) {
  const citedByCount: Record<string, number> = {}
  for (const node of bookNodes) citedByCount[node.id] = 0
  for (const link of links) {
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target
    if (citedByCount[tgtId] !== undefined) citedByCount[tgtId]++
  }
  return [...bookNodes]
    .sort((a, b) => (citedByCount[b.id] || 0) - (citedByCount[a.id] || 0))
    .slice(0, 3)
    .map((n) => ({ ...n, citedBy: citedByCount[n.id] || 0 }))
}


export function computeCommunityActivity(links) {
  return Math.floor(links.length * 3.7 + 12)
}
