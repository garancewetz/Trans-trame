import { describe, expect, it } from 'vitest'
import { isNodeVisibleForFilters } from './nodeVisibility'

const emptyAdjacency = new Map()

describe('isNodeVisibleForFilters — no filter, no highlight', () => {
  it('every node is visible', () => {
    const node = { id: 'b1', type: 'book', axes: ['Feminist Theory'], year: 2000 }
    expect(isNodeVisibleForFilters(node, null, null, emptyAdjacency)).toBe(true)
  })
})

describe('isNodeVisibleForFilters — axis filter', () => {
  it('books on the filtered axis are visible', () => {
    const node = { id: 'b1', type: 'book', axes: ['Feminist Theory'] }
    expect(isNodeVisibleForFilters(node, 'Feminist Theory', null, emptyAdjacency)).toBe(true)
  })

  it('books on other axes are hidden', () => {
    const node = { id: 'b1', type: 'book', axes: ['Queer Studies'] }
    expect(isNodeVisibleForFilters(node, 'Feminist Theory', null, emptyAdjacency)).toBe(false)
  })

  it('author nodes stay visible through axis filters', () => {
    const node = { id: 'a1', type: 'author' }
    expect(isNodeVisibleForFilters(node, 'Feminist Theory', null, emptyAdjacency)).toBe(true)
  })
})

describe('isNodeVisibleForFilters — decade highlight', () => {
  const highlight = { kind: 'decade' as const, decade: 1970 }

  it('shows nodes inside the decade', () => {
    const node = { id: 'b1', type: 'book', year: 1978 }
    expect(isNodeVisibleForFilters(node, null, highlight, emptyAdjacency)).toBe(true)
  })

  it('hides nodes outside the decade', () => {
    const node = { id: 'b1', type: 'book', year: 1989 }
    expect(isNodeVisibleForFilters(node, null, highlight, emptyAdjacency)).toBe(false)
  })

  it('hides nodes with no year', () => {
    const node = { id: 'b1', type: 'book', year: null }
    expect(isNodeVisibleForFilters(node, null, highlight, emptyAdjacency)).toBe(false)
  })
})

describe('isNodeVisibleForFilters — book highlight', () => {
  const adjacency = new Map([
    ['b1', { linkKeys: ['b1->b2'], neighborIds: ['b2'] }],
  ])
  const highlight = { kind: 'book' as const, bookId: 'b1' }

  it('shows the highlighted book itself', () => {
    expect(isNodeVisibleForFilters({ id: 'b1', type: 'book' }, null, highlight, adjacency)).toBe(true)
  })

  it('shows direct neighbors', () => {
    expect(isNodeVisibleForFilters({ id: 'b2', type: 'book' }, null, highlight, adjacency)).toBe(true)
  })

  it('hides unrelated books', () => {
    expect(isNodeVisibleForFilters({ id: 'b3', type: 'book' }, null, highlight, adjacency)).toBe(false)
  })
})

describe('isNodeVisibleForFilters — citedMin highlight', () => {
  const highlight = { kind: 'citedMin' as const, min: 3 }
  const citations = new Map([['b1', 5], ['b2', 2]])

  it('shows books at or above threshold', () => {
    expect(isNodeVisibleForFilters({ id: 'b1', type: 'book' }, null, highlight, emptyAdjacency, citations)).toBe(true)
  })

  it('hides books below threshold', () => {
    expect(isNodeVisibleForFilters({ id: 'b2', type: 'book' }, null, highlight, emptyAdjacency, citations)).toBe(false)
  })

  it('hides books missing from the citations map', () => {
    expect(isNodeVisibleForFilters({ id: 'b3', type: 'book' }, null, highlight, emptyAdjacency, citations)).toBe(false)
  })
})
