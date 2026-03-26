export function getOutgoingRefs(graphData, node) {
  return graphData.links
    .filter((l) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      return srcId === node.id
    })
    .map((l) => {
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      return { link: l, other: graphData.nodes.find((n) => n.id === tgtId) }
    })
}

export function getIncomingRefs(graphData, node) {
  return graphData.links
    .filter((l) => {
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      return tgtId === node.id
    })
    .map((l) => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      return { link: l, other: graphData.nodes.find((n) => n.id === srcId) }
    })
}

export function getLinkNodes(graphData, link) {
  const srcId = typeof link.source === 'object' ? link.source.id : link.source
  const tgtId = typeof link.target === 'object' ? link.target.id : link.target
  return { source: graphData.nodes.find((n) => n.id === srcId), target: graphData.nodes.find((n) => n.id === tgtId) }
}

export function computeSameAuthorBooks(graphData, selectedNode) {
  if (!selectedNode?.author) return []
  const author = selectedNode.author.trim().toLowerCase()
  if (!author) return []
  return graphData.nodes
    .filter((n) => n.id !== selectedNode.id)
    .filter((n) => (n.author || '').trim().toLowerCase() === author)
    .sort((a, b) => {
      const ay = Number(a.year) || 0
      const by = Number(b.year) || 0
      if (ay !== by) return by - ay
      return String(a.title || '').localeCompare(String(b.title || ''), 'fr', { sensitivity: 'base' })
    })
}

