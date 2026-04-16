import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Link } from '@/types/domain'
import type { TablesUpdate } from '@/types/supabase'
import { devWarn } from '@/common/utils/logger'
import {
  deleteLinkRowById,
  insertLinkRow,
  insertLinkRows,
  updateLinkRowById,
} from '../api/graphDataApi'
import { normalizeEndpointId, normalizeId } from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

type NewLink = {
  id: string
  source: string
  target: string
  citation_text: string
  edition: string
  page: string
  context: string
}

type LinkMutationsParams = {
  linksRef: RefObject<Link[]>
  setLinks: Dispatch<SetStateAction<Link[]>>
}

export function useLinkMutations({
  linksRef,
  setLinks,
}: LinkMutationsParams) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

  const addLinkMutation = useMutation({
    mutationFn: async (newLink: NewLink) => {
      const { error } = await insertLinkRow({
        id: newLink.id,
        source_id: newLink.source,
        target_id: newLink.target,
        citation_text: newLink.citation_text,
        edition: newLink.edition,
        page: newLink.page,
        context: newLink.context,
      })
      if (error) throw new Error(error.message)
    },
    onMutate: (newLink) => {
      setLinks((prev) => [...prev, newLink])
    },
    onError: (err) => { devWarn('Erreur ajout lien', err); toast.error("Impossible d'ajouter le lien"); invalidate() },
  })

  // Bulk insert with chunking + per-chunk awaits.
  //
  // Why chunked rather than one big INSERT:
  // - A single `.insert([...])` *should* be atomic, but in practice users
  //   reported partial successes (e.g. 18/37 rows persisted). Root cause is
  //   unclear — may be PostgREST payload handling, timeout on large batches,
  //   or mid-batch RLS rechecks. Chunks of 10 keep each HTTP call small and
  //   let us isolate which chunks fail.
  // - We `await` each chunk sequentially (not Promise.all) to avoid the same
  //   "concurrent-request loss" that bit the per-row mutate() loop.
  // - On any chunk error we DON'T abort: we collect the failure, keep going,
  //   and report a real count at the end. A silent "all failed" toast is
  //   worse than "35/38 liés, 3 échecs" for the user.
  const addLinksMutation = useMutation({
    mutationFn: async (newLinks: NewLink[]) => {
      if (newLinks.length === 0) return { inserted: 0, failed: 0, total: 0 }
      const CHUNK_SIZE = 10
      let inserted = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < newLinks.length; i += CHUNK_SIZE) {
        const chunk = newLinks.slice(i, i + CHUNK_SIZE)
        const rows = chunk.map((l) => ({
          id: l.id,
          source_id: l.source,
          target_id: l.target,
          citation_text: l.citation_text,
          edition: l.edition,
          page: l.page,
          context: l.context,
        }))
        try {
          const { data, error } = await insertLinkRows(rows)
          if (error) {
            failed += chunk.length
            errors.push(error.message)
            devWarn(`[addLinks] chunk ${i / CHUNK_SIZE + 1} failed`, error.message)
          } else {
            // Count the IDs Supabase actually returned. If fewer than we sent,
            // some rows were silently dropped (RLS row-filter, trigger abort, …)
            // and we MUST treat the diff as a failure — otherwise the optimistic
            // state shows rows that don't exist in DB, the refetch wipes them,
            // and the user sees orphans come back despite the success toast.
            const returned = Array.isArray(data) ? data.length : 0
            inserted += returned
            if (returned < chunk.length) {
              const missing = chunk.length - returned
              failed += missing
              errors.push(`Supabase a accepté ${returned}/${chunk.length} lignes (${missing} refusée${missing > 1 ? 's' : ''} silencieusement — RLS ou trigger ?)`)
              devWarn(`[addLinks] chunk ${i / CHUNK_SIZE + 1}: silent partial drop`, { sent: chunk.length, returned })
            }
          }
        } catch (err) {
          failed += chunk.length
          errors.push(err instanceof Error ? err.message : 'inconnu')
          devWarn(`[addLinks] chunk ${i / CHUNK_SIZE + 1} threw`, err)
        }
      }

      return { inserted, failed, total: newLinks.length, errors }
    },
    onMutate: (newLinks) => {
      setLinks((prev) => [...prev, ...newLinks])
    },
    onSuccess: (result) => {
      if (!result) return
      const { inserted, failed, total, errors } = result
      if (failed === 0) {
        toast.success(`${inserted} lien${inserted > 1 ? 's' : ''} créé${inserted > 1 ? 's' : ''}`)
      } else if (inserted === 0) {
        toast.error(`Aucun lien créé (${failed} échecs). ${errors?.[0] ?? ''}`)
      } else {
        toast.warning(`${inserted}/${total} liens créés, ${failed} échec${failed > 1 ? 's' : ''}. ${errors?.[0] ?? ''}`)
      }
      // Refetch the true state so optimistic rows for failed chunks are rolled back.
      invalidate()
    },
    onError: (err) => { devWarn('Erreur ajout liens (bulk)', err); toast.error("Impossible d'ajouter les liens"); invalidate() },
  })

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await deleteLinkRowById(linkId)
      if (error) throw new Error(error.message)
    },
    onMutate: (linkId) => {
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    },
    onError: (err) => { devWarn('Erreur suppression lien', err); toast.error('Impossible de supprimer le lien'); invalidate() },
  })

  const updateLinkMutation = useMutation({
    mutationFn: async ({ linkId, updatedFields }: { linkId: string; updatedFields: TablesUpdate<'links'> }) => {
      const { error } = await updateLinkRowById(linkId, updatedFields)
      if (error) throw new Error(error.message)
    },
    onMutate: ({ linkId, updatedFields }) => {
      setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...updatedFields } : l)))
    },
    onError: (err) => { devWarn('Erreur mise à jour lien', err); toast.error('Impossible de modifier le lien'); invalidate() },
  })

  // Build a NewLink from user input + dedup it against existing links.
  // Returns null if invalid or already present (same source/target/citation/page/edition).
  const buildAndDedup = (
    link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>),
    extraSeen?: Set<string>,
  ): NewLink | null => {
    const srcId = normalizeEndpointId(link.source)
    const tgtId = normalizeEndpointId(link.target)
    if (!srcId || !tgtId) return null
    const citationText = link.citation_text || ''
    const page = link.page || ''
    const edition = link.edition || ''
    const isDuplicate = linksRef.current!.some((l) => {
      const s = normalizeId(l.source)
      const t = normalizeId(l.target)
      return (
        s === srcId &&
        t === tgtId &&
        (l.citation_text || '') === citationText &&
        (l.page || '') === page &&
        (l.edition || '') === edition
      )
    })
    if (isDuplicate) return null
    if (extraSeen) {
      const key = `${srcId}|${tgtId}|${citationText}|${page}|${edition}`
      if (extraSeen.has(key)) return null
      extraSeen.add(key)
    }
    return {
      id: link.id || crypto.randomUUID(),
      source: srcId,
      target: tgtId,
      citation_text: citationText,
      edition,
      page,
      context: link.context || '',
    }
  }

  const handleAddLink = useCallback(
    (link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)) => {
      const newLink = buildAndDedup(link)
      if (!newLink) return
      addLinkMutation.mutate(newLink)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linksRef, addLinkMutation]
  )

  // Batch version: dedup + single INSERT for all links at once.
  // Prefer this for bulk operations (orphan linking, bibliography import).
  const handleAddLinks = useCallback(
    (links: Array<Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)>) => {
      const seen = new Set<string>()
      const deduped: NewLink[] = []
      for (const link of links) {
        const newLink = buildAndDedup(link, seen)
        if (newLink) deduped.push(newLink)
      }
      if (deduped.length === 0) return
      addLinksMutation.mutate(deduped)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linksRef, addLinksMutation]
  )

  const handleDeleteLink = useCallback(
    (linkId: string) => deleteLinkMutation.mutate(linkId),
    [deleteLinkMutation]
  )

  const handleUpdateLink = useCallback(
    (linkId: string, updatedFields: TablesUpdate<'links'>) =>
      updateLinkMutation.mutate({ linkId, updatedFields }),
    [updateLinkMutation]
  )

  return { handleAddLink, handleAddLinks, handleDeleteLink, handleUpdateLink }
}
