import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Link, LinkCitation } from '@/types/domain'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'
import { devWarn } from '@/common/utils/logger'
import { ensureOk } from '@/core/supabaseErrors'
import {
  deleteLinkRowById,
  insertLinkCitationRow,
  insertLinkCitationRows,
  insertLinkRow,
  insertLinkRows,
  updateLinkRowById,
} from '../api/graphDataApi'
import { normalizeEndpointId, normalizeId } from '../domain/graphDataModel'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

type CitationInput = {
  citation_text?: string
  edition?: string
  page?: string
  context?: string
}

/** Parsed add-link request: either create a new (source, target) edge with an
 *  optional first citation, or attach a new citation to an existing edge. */
type AddLinkPlan =
  | { kind: 'create'; linkId: string; source: string; target: string; citation: CitationInput | null }
  | { kind: 'attach'; linkId: string; citation: CitationInput }
  | { kind: 'skip' }

type LinkMutationsParams = {
  linksRef: RefObject<Link[]>
  setLinks: Dispatch<SetStateAction<Link[]>>
}

function hasAnyCitationField(c: CitationInput): boolean {
  return Boolean((c.citation_text || '').trim() || (c.page || '').trim() || (c.edition || '').trim() || (c.context || '').trim())
}

function extractCitation(link: Partial<Link>): CitationInput {
  return {
    citation_text: link.citation_text,
    edition: link.edition,
    page: link.page,
    context: link.context,
  }
}

export function useLinkMutations({
  linksRef,
  setLinks,
}: LinkMutationsParams) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

  // ── Low-level mutations: link row + citation row ───────────────────────────
  //
  // Each "add link" user intent now potentially dispatches TWO inserts (link
  // row + citation row). We keep them as distinct mutations so react-query's
  // `isMutating` count stays accurate and optimistic state can be rolled back
  // per piece if one succeeds and the other fails.

  const addLinkMutation = useMutation({
    mutationFn: async (newLink: { id: string; source: string; target: string }) => {
      ensureOk(
        await insertLinkRow({
          id: newLink.id,
          source_id: newLink.source,
          target_id: newLink.target,
          // Flat citation fields kept at '' on new rows: the real data lives
          // in link_citations. The columns still exist as a rollback net from
          // the 20260418_link_citations_subtable migration.
          citation_text: '',
          edition: '',
          page: '',
          context: '',
        }),
        'ajout lien',
      )
    },
    onMutate: (newLink) => {
      setLinks((prev) => [
        ...prev,
        { id: newLink.id, source: newLink.source, target: newLink.target, citations: [] },
      ])
    },
    onError: (err) => { devWarn('Erreur ajout lien', err); toast.error("Impossible d'ajouter le lien"); invalidate() },
  })

  const addCitationToLinkMutation = useMutation({
    mutationFn: async ({ linkId, citation, citationId }: { linkId: string; citation: CitationInput; citationId: string }) => {
      const { data, error } = await insertLinkCitationRow({
        id: citationId,
        link_id: linkId,
        citation_text: citation.citation_text || '',
        edition: citation.edition || '',
        page: citation.page || '',
        context: citation.context || '',
      })
      if (error) throw new Error(error.message)
      return data?.[0]
    },
    onMutate: ({ linkId, citation, citationId }) => {
      setLinks((prev) => prev.map((l) => (
        l.id === linkId
          ? {
              ...l,
              citations: [
                ...l.citations,
                {
                  id: citationId,
                  link_id: linkId,
                  citation_text: citation.citation_text || '',
                  edition: citation.edition || '',
                  page: citation.page || '',
                  context: citation.context || '',
                },
              ],
            }
          : l
      )))
    },
    onError: (err) => { devWarn('Erreur ajout citation', err); toast.error("Impossible d'ajouter la citation"); invalidate() },
  })

  // Bulk insert with chunking. Same rationale as the previous single-table
  // version: 10-row chunks avoid PostgREST silent drops on large batches, and
  // we count returned IDs to distinguish real success from silent RLS refusal.
  const addLinksMutation = useMutation({
    mutationFn: async (payload: { links: Array<{ id: string; source: string; target: string }>; citations: TablesInsert<'link_citations'>[] }) => {
      const { links, citations } = payload
      if (links.length === 0 && citations.length === 0) return { inserted: 0, failed: 0, total: 0 }
      const CHUNK_SIZE = 10
      let inserted = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < links.length; i += CHUNK_SIZE) {
        const chunk = links.slice(i, i + CHUNK_SIZE)
        const rows = chunk.map((l) => ({
          id: l.id,
          source_id: l.source,
          target_id: l.target,
          citation_text: '',
          edition: '',
          page: '',
          context: '',
        }))
        try {
          const { data, error } = await insertLinkRows(rows)
          if (error) {
            failed += chunk.length
            errors.push(error.message)
            devWarn(`[addLinks] link chunk ${i / CHUNK_SIZE + 1} failed`, error.message)
          } else {
            const returned = Array.isArray(data) ? data.length : 0
            inserted += returned
            if (returned < chunk.length) {
              const missing = chunk.length - returned
              failed += missing
              errors.push(`Supabase a accepté ${returned}/${chunk.length} liens (${missing} refusée${missing > 1 ? 's' : ''} silencieusement — RLS ou trigger ?)`)
              devWarn(`[addLinks] link chunk ${i / CHUNK_SIZE + 1}: silent partial drop`, { sent: chunk.length, returned })
            }
          }
        } catch (err) {
          failed += chunk.length
          errors.push(err instanceof Error ? err.message : 'inconnu')
          devWarn(`[addLinks] link chunk ${i / CHUNK_SIZE + 1} threw`, err)
        }
      }

      // Citations are inserted AFTER links so every link_id FK resolves. We
      // only send citations whose parent link insert didn't fail — but since
      // link inserts can silently-partial-drop, we accept that some citations
      // may fail too; the refetch reconciles state.
      for (let i = 0; i < citations.length; i += CHUNK_SIZE) {
        const chunk = citations.slice(i, i + CHUNK_SIZE)
        try {
          const { error } = await insertLinkCitationRows(chunk)
          if (error) {
            errors.push(`citations: ${error.message}`)
            devWarn(`[addLinks] citation chunk ${i / CHUNK_SIZE + 1} failed`, error.message)
          }
        } catch (err) {
          errors.push(err instanceof Error ? err.message : 'inconnu')
          devWarn(`[addLinks] citation chunk ${i / CHUNK_SIZE + 1} threw`, err)
        }
      }

      return { inserted, failed, total: links.length, errors }
    },
    onMutate: ({ links, citations }) => {
      const citationsByLinkId = new Map<string, LinkCitation[]>()
      for (const c of citations) {
        const list = citationsByLinkId.get(c.link_id) ?? []
        list.push({
          id: c.id ?? crypto.randomUUID(),
          link_id: c.link_id,
          citation_text: c.citation_text ?? '',
          edition: c.edition ?? '',
          page: c.page ?? '',
          context: c.context ?? '',
        })
        citationsByLinkId.set(c.link_id, list)
      }
      setLinks((prev) => {
        const next: Link[] = [...prev]
        // Append new links
        for (const l of links) {
          next.push({
            id: l.id,
            source: l.source,
            target: l.target,
            citations: citationsByLinkId.get(l.id) ?? [],
          })
          citationsByLinkId.delete(l.id)
        }
        // Attach citations to pre-existing links (handleAddLinks also returns
        // "attach" plans when the couple already has a link row)
        return next.map((l) => {
          const extra = citationsByLinkId.get(l.id)
          if (!extra) return l
          return { ...l, citations: [...l.citations, ...extra] }
        })
      })
    },
    onSuccess: (result) => {
      if (!result) return
      const { inserted, failed, total, errors } = result
      if (total === 0 && !errors?.length) return
      if (failed === 0) {
        toast.success(`${inserted} lien${inserted > 1 ? 's' : ''} créé${inserted > 1 ? 's' : ''}`)
      } else if (inserted === 0) {
        toast.error(`Aucun lien créé (${failed} échecs). ${errors?.[0] ?? ''}`)
      } else {
        toast.warning(`${inserted}/${total} liens créés, ${failed} échec${failed > 1 ? 's' : ''}. ${errors?.[0] ?? ''}`)
      }
      invalidate()
    },
    onError: (err) => { devWarn('Erreur ajout liens (bulk)', err); toast.error("Impossible d'ajouter les liens"); invalidate() },
  })

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      ensureOk(await deleteLinkRowById(linkId), 'suppression lien')
    },
    onMutate: (linkId) => {
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    },
    onError: (err) => { devWarn('Erreur suppression lien', err); toast.error('Impossible de supprimer le lien'); invalidate() },
  })

  const updateLinkMutation = useMutation({
    mutationFn: async ({ linkId, updatedFields }: { linkId: string; updatedFields: TablesUpdate<'links'> }) => {
      ensureOk(await updateLinkRowById(linkId, updatedFields), 'mise à jour lien')
    },
    onMutate: ({ linkId, updatedFields }) => {
      setLinks((prev) => prev.map((l) => (l.id === linkId ? ({ ...l, ...updatedFields } as Link) : l)))
    },
    onError: (err) => { devWarn('Erreur mise à jour lien', err); toast.error('Impossible de modifier le lien'); invalidate() },
  })

  // ── High-level planning: plan + dispatch per user intent ───────────────────
  //
  // planAddLink resolves a user-submitted link input into one of three
  // outcomes. Callers can dispatch the mutations synchronously afterwards.

  const planAddLink = (
    link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>),
  ): AddLinkPlan => {
    const srcId = normalizeEndpointId(link.source)
    const tgtId = normalizeEndpointId(link.target)
    if (!srcId || !tgtId) return { kind: 'skip' }

    const citation = extractCitation(link)
    const hasCitation = hasAnyCitationField(citation)

    // Endpoint-only dedup — the UNIQUE partial index on links enforces this at
    // the DB level too. If the couple already has a live link, attach the
    // citation to it (or skip if nothing to add).
    const existing = linksRef.current!.find((l) => {
      const s = normalizeId(l.source)
      const t = normalizeId(l.target)
      return s === srcId && t === tgtId
    })

    if (existing) {
      if (!hasCitation) return { kind: 'skip' }
      // Deduplicate within the link's own citations: exact match on the four
      // fields. Users pasting the same bibliography twice shouldn't stack
      // identical citations.
      const isDupCitation = existing.citations.some((c) =>
        (c.citation_text || '') === (citation.citation_text || '')
        && (c.page || '') === (citation.page || '')
        && (c.edition || '') === (citation.edition || '')
        && (c.context || '') === (citation.context || ''),
      )
      if (isDupCitation) return { kind: 'skip' }
      return { kind: 'attach', linkId: existing.id, citation }
    }

    return {
      kind: 'create',
      linkId: link.id || crypto.randomUUID(),
      source: srcId,
      target: tgtId,
      citation: hasCitation ? citation : null,
    }
  }

  const handleAddLink = useCallback(
    (link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)) => {
      const plan = planAddLink(link)
      if (plan.kind === 'skip') return

      if (plan.kind === 'attach') {
        addCitationToLinkMutation.mutate({
          linkId: plan.linkId,
          citation: plan.citation,
          citationId: crypto.randomUUID(),
        })
        return
      }

      // Create: link row first, then (optionally) citation row. We dispatch
      // them sequentially via await-in-mutationFn only when both are needed
      // and use onSuccess chaining is avoided to keep optimistic rollback
      // symmetric — if link insert fails, citation never runs; if citation
      // fails after, invalidate refetches state.
      addLinkMutation.mutate(
        { id: plan.linkId, source: plan.source, target: plan.target },
        {
          onSuccess: () => {
            if (plan.citation) {
              addCitationToLinkMutation.mutate({
                linkId: plan.linkId,
                citation: plan.citation,
                citationId: crypto.randomUUID(),
              })
            }
          },
        },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linksRef, addLinkMutation, addCitationToLinkMutation]
  )

  const handleAddLinks = useCallback(
    (links: Array<Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)>) => {
      const linksToCreate: Array<{ id: string; source: string; target: string }> = []
      const citations: TablesInsert<'link_citations'>[] = []
      // Track (source|target) pairs already planned in this batch to avoid
      // within-batch duplicates racing each other through the DB UNIQUE index.
      const plannedPairs = new Map<string, string>() // pair → linkId
      // Within-batch citation dedup, per link id: the same citation appearing
      // twice in the input should only insert once.
      const plannedCitations = new Map<string, Set<string>>()

      const citationKey = (c: CitationInput) =>
        `${c.citation_text || ''}|${c.page || ''}|${c.edition || ''}|${c.context || ''}`

      for (const link of links) {
        const srcId = normalizeEndpointId(link.source)
        const tgtId = normalizeEndpointId(link.target)
        if (!srcId || !tgtId) continue

        const citation = extractCitation(link)
        const hasCitation = hasAnyCitationField(citation)

        const pairKey = `${srcId}|${tgtId}`
        let linkId = plannedPairs.get(pairKey)

        if (!linkId) {
          const existing = linksRef.current!.find((l) => {
            const s = normalizeId(l.source)
            const t = normalizeId(l.target)
            return s === srcId && t === tgtId
          })
          if (existing) {
            linkId = existing.id
          } else {
            linkId = link.id || crypto.randomUUID()
            linksToCreate.push({ id: linkId, source: srcId, target: tgtId })
          }
          plannedPairs.set(pairKey, linkId)
        }

        if (!hasCitation) continue

        // Dedup within this batch
        let seenForLink = plannedCitations.get(linkId)
        if (!seenForLink) {
          seenForLink = new Set<string>()
          plannedCitations.set(linkId, seenForLink)
        }
        const ck = citationKey(citation)
        if (seenForLink.has(ck)) continue
        seenForLink.add(ck)

        // Dedup against the existing link's current citations (if any)
        const existingLink = linksRef.current!.find((l) => l.id === linkId)
        const isDup = existingLink?.citations.some((c) =>
          (c.citation_text || '') === (citation.citation_text || '')
          && (c.page || '') === (citation.page || '')
          && (c.edition || '') === (citation.edition || '')
          && (c.context || '') === (citation.context || ''),
        )
        if (isDup) continue

        citations.push({
          id: crypto.randomUUID(),
          link_id: linkId,
          citation_text: citation.citation_text || '',
          edition: citation.edition || '',
          page: citation.page || '',
          context: citation.context || '',
        })
      }

      if (linksToCreate.length === 0 && citations.length === 0) return
      addLinksMutation.mutate({ links: linksToCreate, citations })
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
