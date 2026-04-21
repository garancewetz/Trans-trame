import { describe, expect, it } from 'vitest'
import { diffAuthorIds, fetchAllPaginated } from './graphDataApi'

describe('diffAuthorIds', () => {
  it('returns empty diffs when current and target match', () => {
    const { toAdd, toRemove } = diffAuthorIds(['a', 'b'], ['a', 'b'])
    expect(toAdd).toEqual([])
    expect(toRemove).toEqual([])
  })

  it('ignores order between current and target', () => {
    const { toAdd, toRemove } = diffAuthorIds(['a', 'b'], ['b', 'a'])
    expect(toAdd).toEqual([])
    expect(toRemove).toEqual([])
  })

  it('detects pure additions', () => {
    const { toAdd, toRemove } = diffAuthorIds(['a'], ['a', 'b'])
    expect(toAdd).toEqual(['b'])
    expect(toRemove).toEqual([])
  })

  it('detects pure removals', () => {
    const { toAdd, toRemove } = diffAuthorIds(['a', 'b'], ['a'])
    expect(toAdd).toEqual([])
    expect(toRemove).toEqual(['b'])
  })

  it('computes mixed add and remove', () => {
    const { toAdd, toRemove } = diffAuthorIds(['a', 'b'], ['b', 'c'])
    expect(toAdd).toEqual(['c'])
    expect(toRemove).toEqual(['a'])
  })

  it('treats empty target as full removal', () => {
    const { toAdd, toRemove } = diffAuthorIds(['a', 'b'], [])
    expect(toAdd).toEqual([])
    expect(toRemove.sort()).toEqual(['a', 'b'])
  })
})

describe('fetchAllPaginated', () => {
  it('stops after a partial last page', async () => {
    const pages = [
      Array.from({ length: 1000 }, (_, i) => i),
      Array.from({ length: 500 }, (_, i) => 1000 + i),
    ]
    let calls = 0
    const res = await fetchAllPaginated(
      async () => ({ data: pages[calls++] ?? [], error: null }),
      'test',
    )
    expect(res.error).toBeNull()
    expect(res.data?.length).toBe(1500)
    expect(calls).toBe(2)
  })

  it('stops when a page is empty', async () => {
    const pages = [
      Array.from({ length: 1000 }, (_, i) => i),
      [],
    ]
    let calls = 0
    const res = await fetchAllPaginated(
      async () => ({ data: pages[calls++] ?? [], error: null }),
      'test',
    )
    expect(res.error).toBeNull()
    expect(res.data?.length).toBe(1000)
    expect(calls).toBe(2)
  })

  it('requests sequential ranges', async () => {
    const ranges: Array<[number, number]> = []
    let calls = 0
    await fetchAllPaginated(
      async (from, to) => {
        ranges.push([from, to])
        calls++
        return { data: calls < 2 ? Array(1000).fill(0) : [], error: null }
      },
      'test',
    )
    expect(ranges[0]).toEqual([0, 999])
    expect(ranges[1]).toEqual([1000, 1999])
  })

  it('propagates errors and stops', async () => {
    let calls = 0
    const res = await fetchAllPaginated(
      async () => {
        calls++
        return { data: null, error: { message: 'boom' } }
      },
      'test',
    )
    expect(res.error).toEqual({ message: 'boom' })
    expect(res.data).toBeNull()
    expect(calls).toBe(1)
  })
})
