export function resolveLinks(links, nodes) {
  return links.map((link) => {
    const srcId = typeof link.source === 'object' ? link.source.id : link.source
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target
    return {
      ...link,
      _srcId: srcId,
      _tgtId: tgtId,
      sourceNode: nodes.find((n) => n.id === srcId) || null,
      targetNode: nodes.find((n) => n.id === tgtId) || null,
    }
  })
}
