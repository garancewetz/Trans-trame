function extractId(value) {
  if (value && typeof value === 'object') return value.id
  return value
}

export function resolveLinks(links, nodes) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  return links.map((link) => {
    const srcId = extractId(link.source)
    const tgtId = extractId(link.target)
    return {
      ...link,
      _srcId: srcId,
      _tgtId: tgtId,
      sourceNode: nodeMap.get(srcId) ?? null,
      targetNode: nodeMap.get(tgtId) ?? null,
    }
  })
}
