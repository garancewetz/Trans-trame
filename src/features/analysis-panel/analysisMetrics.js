import { AXES, AXES_COLORS } from '../../categories'

export function computeAxisStats(bookNodes) {
  const counts = {}
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
  const degreeMap = {}
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
  const citedByCount = {}
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

export function computeWikiGaps(bookNodes, links) {
  const pairCounts = {}
  for (let i = 0; i < AXES.length; i++) {
    for (let j = i + 1; j < AXES.length; j++) {
      pairCounts[`${AXES[i]}|${AXES[j]}`] = 0
    }
  }
  for (const link of links) {
    const srcId = typeof link.source === 'object' ? link.source.id : link.source
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target
    const srcNode = bookNodes.find((n) => n.id === srcId)
    const tgtNode = bookNodes.find((n) => n.id === tgtId)
    if (!srcNode || !tgtNode) continue
    for (const a of srcNode.axes || []) {
      for (const b of tgtNode.axes || []) {
        if (a === b) continue
        const key = AXES.indexOf(a) < AXES.indexOf(b) ? `${a}|${b}` : `${b}|${a}`
        if (pairCounts[key] !== undefined) pairCounts[key]++
      }
    }
  }
  return Object.entries(pairCounts)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key, count]) => {
      const [a, b] = key.split('|')
      return { a, b, count }
    })
}

export function computeCommunityActivity(links) {
  return Math.floor(links.length * 3.7 + 12)
}
