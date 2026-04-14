import { useCallback, type RefObject, type Dispatch, type SetStateAction } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Link } from '@/types/domain'
import type { TablesUpdate } from '@/types/supabase'
import { devWarn } from '@/common/utils/logger'
import {
  deleteLinkRowById,
  insertLinkRow,
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

  const handleAddLink = useCallback(
    (link: Link | (Partial<Link> & Pick<Link, 'source' | 'target'>)) => {
      const srcId = normalizeEndpointId(link.source)
      const tgtId = normalizeEndpointId(link.target)
      if (!srcId || !tgtId) return
      const citationText = link.citation_text || ''
      const page = link.page || ''
      const edition = link.edition || ''
      // A citation is uniquely identified by (source, target, citation_text, page, edition):
      // the same work can be cited multiple times in another on different passages.
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
      if (isDuplicate) return
      addLinkMutation.mutate({
        id: link.id || crypto.randomUUID(),
        source: srcId,
        target: tgtId,
        citation_text: citationText,
        edition,
        page,
        context: link.context || '',
      })
    },
    [linksRef, addLinkMutation]
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

  return { handleAddLink, handleDeleteLink, handleUpdateLink }
}
