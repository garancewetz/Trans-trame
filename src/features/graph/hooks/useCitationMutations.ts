import { useCallback, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Link, LinkCitation } from '@/types/domain'
import type { TablesUpdate } from '@/types/supabase'
import { devWarn } from '@/common/utils/logger'
import { ensureOk } from '@/core/supabaseErrors'
import {
  deleteLinkCitationRowById,
  insertLinkCitationRow,
  updateLinkCitationRowById,
} from '../api/graphDataApi'
import { DATASET_QUERY_KEY } from '../api/queryKeys'

type CitationMutationsParams = {
  linksRef: RefObject<Link[]>
  setLinks: Dispatch<SetStateAction<Link[]>>
}

type CitationFields = {
  citation_text?: string
  edition?: string
  page?: string
  context?: string
}

export function useCitationMutations({ linksRef, setLinks }: CitationMutationsParams) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: DATASET_QUERY_KEY })

  const addCitationMutation = useMutation({
    mutationFn: async ({ citationId, linkId, fields }: { citationId: string; linkId: string; fields: CitationFields }) => {
      ensureOk(
        await insertLinkCitationRow({
          id: citationId,
          link_id: linkId,
          citation_text: fields.citation_text || '',
          edition: fields.edition || '',
          page: fields.page || '',
          context: fields.context || '',
        }),
        'ajout citation',
      )
    },
    onMutate: ({ citationId, linkId, fields }) => {
      setLinks((prev) => prev.map((l) => (
        l.id === linkId
          ? {
              ...l,
              citations: [
                ...l.citations,
                {
                  id: citationId,
                  link_id: linkId,
                  citation_text: fields.citation_text || '',
                  edition: fields.edition || '',
                  page: fields.page || '',
                  context: fields.context || '',
                },
              ],
            }
          : l
      )))
    },
    onError: (err) => { devWarn('Erreur ajout citation', err); toast.error("Impossible d'ajouter la citation"); invalidate() },
  })

  const updateCitationMutation = useMutation({
    mutationFn: async ({ citationId, fields }: { citationId: string; fields: TablesUpdate<'link_citations'> }) => {
      ensureOk(await updateLinkCitationRowById(citationId, fields), 'mise à jour citation')
    },
    onMutate: ({ citationId, fields }) => {
      setLinks((prev) => prev.map((l) => {
        const idx = l.citations.findIndex((c) => c.id === citationId)
        if (idx === -1) return l
        const nextCitations = l.citations.slice()
        nextCitations[idx] = { ...nextCitations[idx], ...fields } as LinkCitation
        return { ...l, citations: nextCitations }
      }))
    },
    onError: (err) => { devWarn('Erreur mise à jour citation', err); toast.error('Impossible de modifier la citation'); invalidate() },
  })

  const deleteCitationMutation = useMutation({
    mutationFn: async (citationId: string) => {
      ensureOk(await deleteLinkCitationRowById(citationId), 'suppression citation')
    },
    onMutate: (citationId) => {
      setLinks((prev) => prev.map((l) => {
        if (!l.citations.some((c) => c.id === citationId)) return l
        return { ...l, citations: l.citations.filter((c) => c.id !== citationId) }
      }))
    },
    onError: (err) => { devWarn('Erreur suppression citation', err); toast.error('Impossible de supprimer la citation'); invalidate() },
  })

  const handleAddCitation = useCallback(
    (linkId: string, fields: CitationFields) => {
      const exists = linksRef.current!.some((l) => l.id === linkId)
      if (!exists) {
        devWarn('[handleAddCitation] link not found in ref', { linkId })
        return
      }
      addCitationMutation.mutate({ citationId: crypto.randomUUID(), linkId, fields })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linksRef, addCitationMutation],
  )

  const handleUpdateCitation = useCallback(
    (citationId: string, fields: TablesUpdate<'link_citations'>) =>
      updateCitationMutation.mutate({ citationId, fields }),
    [updateCitationMutation],
  )

  const handleDeleteCitation = useCallback(
    (citationId: string) => deleteCitationMutation.mutate(citationId),
    [deleteCitationMutation],
  )

  return { handleAddCitation, handleUpdateCitation, handleDeleteCitation }
}
